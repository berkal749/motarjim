import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { parseHtml } from '@html-native/parser';
import { parseCss, applyStyles, analyzeLayoutIntents, buildResponsiveMetadata } from '@html-native/css-analyzer';
import { detectSemantics } from '@html-native/semantic-analyzer';
import { styledNodeToIr, enrichWithIntent, enrichWithIntentSync } from '@html-native/ir';
import { optimize } from '@html-native/optimizer';
import { generate as generateFlutter } from '@html-native/generator-flutter';
import { generate as generateCompose } from '@html-native/generator-compose';
import { generate as generateSwiftUI } from '@html-native/generator-swiftui';
import type { HtmlNode, StyledNode, PlatformTarget, GenerateResult, UiNode } from '@html-native/shared';
import type { ResolvedOptions, ConversionStats } from '../types.js';
import { countComponentNodes, countLines, computeOptimizationSavings, generateStatsTable } from './stats.js';
import { createPipelineSpinners } from '../ui/progress.js';

export interface PipelineResult {
  code: string;
  stats: ConversionStats;
}

function countHtmlNodes(node: HtmlNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countHtmlNodes(child);
  }
  return count;
}

export async function runPipeline(options: ResolvedOptions): Promise<PipelineResult> {
  const spinners = createPipelineSpinners();
  const startTime = Date.now();

  try {
    spinners.start('Parsing HTML');
    const html = readFileSync(options.input, 'utf-8');
    const ast = parseHtml(html);
    const htmlNodeCount = countHtmlNodes(ast);
    spinners.succeed('Parsing HTML');

    spinners.start('Parsing CSS');
    let css = '';
    if (options.css) {
      css = readFileSync(options.css, 'utf-8');
    }
    const stylesheet = parseCss(css);
    spinners.succeed('Parsing CSS');

    spinners.start('Semantic Analysis');
    let styledNodes = applyStyles(ast.children, stylesheet);
    const styledCount = styledNodes.reduce((acc, n) => acc + countHtmlNodes(n.node), 0);

    // CSS intent analysis (always runs, no AI needed)
    styledNodes = analyzeLayoutIntents(styledNodes);

    // Responsive metadata (always runs)
    const responsiveMetadata = buildResponsiveMetadata(stylesheet);

    let hints;
    if (options.aiEnhance) {
      const { createAiDetector } = await import('@html-native/semantic-analyzer/ai');
      const aiDetector = createAiDetector(options.aiModel ? { model: options.aiModel } : undefined);
      hints = await aiDetector(styledNodes);
    } else {
      hints = detectSemantics(styledNodes);
    }
    spinners.succeed('Semantic Analysis');

    spinners.start('IR Conversion');
    const rootStyled: StyledNode = {
      node: ast,
      styles: {},
      children: styledNodes,
      layoutIntent: { type: 'Stack', properties: {}, confidence: 1 },
    };
    let ir = styledNodeToIr(rootStyled, hints);

    // Attach responsive metadata
    if (responsiveMetadata.breakpoints.length > 0) {
      ir = attachResponsiveMetadata(ir, responsiveMetadata);
    }

    // AI-powered intent inference (rule-based always, AI if enabled)
    if (options.aiEnhance) {
      ir = await enrichWithIntent(ir, { enabled: true, aiConfig: options.aiModel ? { model: options.aiModel } : undefined });
    } else {
      ir = enrichWithIntentSync(ir);
    }

    const componentsDetected = countComponentNodes(ir);
    spinners.succeed('IR Conversion');

    spinners.start('Optimization');
    const irBefore = structuredClone(ir);
    const optimized = optimize(ir);
    const savings = computeOptimizationSavings(irBefore, optimized);
    spinners.succeed('Optimization');

    spinners.start('Code Generation');
    let result: GenerateResult;
    switch (options.target) {
      case 'flutter':
        result = generateFlutter(optimized);
        break;
      case 'compose':
        result = generateCompose(optimized);
        break;
      case 'swiftui':
        result = generateSwiftUI(optimized);
        break;
      default:
        throw new Error(`Unknown target "${options.target}". Use flutter, compose, or swiftui.`);
    }
    spinners.succeed('Code Generation');

    const duration = (Date.now() - startTime) / 1000;

    const stats: ConversionStats = {
      htmlNodes: htmlNodeCount,
      styledNodes: styledCount,
      componentsDetected,
      optimizationSavings: savings,
      generatedLines: countLines(result.code),
      target: options.target,
      duration,
    };

    return { code: result.code, stats };
  } catch (err) {
    spinners.stopAll();
    throw err;
  }
}

function attachResponsiveMetadata(ir: UiNode, metadata: any): UiNode {
  function walk(node: UiNode): UiNode {
    return {
      ...node,
      responsiveMetadata: metadata,
      children: node.children.map(walk),
    };
  }
  return walk(ir);
}

export function writeOutput(code: string, outputPath: string): void {
  const resolved = resolve(outputPath);
  const dir = dirname(resolved);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(resolved, code, 'utf-8');
}

export function logStats(stats: ConversionStats): void {
  console.log(generateStatsTable(stats));
}

export function logDryRun(options: ResolvedOptions): void {
  const header = '─'.repeat(40);
  console.log(`\n${header}`);
  console.log('  Dry Run — No files will be generated');
  console.log(`${header}`);
  console.log(`  Input:       ${options.input}`);
  if (options.css) console.log(`  CSS:         ${options.css}`);
  console.log(`  Target:      ${options.target}`);
  if (options.output) console.log(`  Output:      ${options.output}`);
  console.log(`  AI Enhance:  ${options.aiEnhance ? 'Yes' : 'No'}`);
  console.log(`${header}\n`);
}
