import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { parseHtml } from '@html-native/parser';
import { parseCss, applyStyles, analyzeLayoutIntents, buildResponsiveMetadata } from '@html-native/css-analyzer';
import { detectSemantics } from '@html-native/semantic-analyzer';
import { analyzeAccessibility } from '@html-native/accessibility-analyzer';
import { styledNodeToIr, enrichWithIntent, enrichWithIntentSync } from '@html-native/ir';
import { optimize } from '@html-native/optimizer';
import { generate as generateFlutter } from '@html-native/generator-flutter';
import { generate as generateCompose } from '@html-native/generator-compose';
import { generate as generateSwiftUI } from '@html-native/generator-swiftui';
import type { HtmlNode, StyledNode, PlatformTarget, GenerateResult, UiNode, Result, Diagnostic } from '@html-native/shared';
import { formatDiagnostics } from '@html-native/shared/diagnostics.js';
import type { ResolvedOptions, ConversionStats } from '../types.js';
import { countComponentNodes, countLines, computeOptimizationSavings, generateStatsTable } from './stats.js';
import { createPipelineSpinners } from '../ui/progress.js';

export interface PipelineResult {
  code: string;
  stats: ConversionStats;
}

export class PipelineError extends Error {
  diagnostics: Diagnostic[];

  constructor(diagnostics: Diagnostic[]) {
    super(formatDiagnostics(diagnostics));
    this.name = 'PipelineError';
    this.diagnostics = diagnostics;
  }
}

function requireOk<T>(result: Result<T>, phase: string): T {
  if (!result.ok) {
    throw new PipelineError(result.diagnostics);
  }
  return result.value;
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
    const parseResult = parseHtml(html, options.input);
    const ast = requireOk(parseResult, 'parser');
    const htmlNodeCount = countHtmlNodes(ast);
    spinners.succeed('Parsing HTML');

    spinners.start('Parsing CSS');
    let css = '';
    if (options.css) {
      css = readFileSync(options.css, 'utf-8');
    }
    const cssResult = parseCss(css, options.css || 'styles.css');
    const stylesheet = requireOk(cssResult, 'css');
    spinners.succeed('Parsing CSS');

    spinners.start('Semantic Analysis');
    const applyResult = applyStyles(ast.children, stylesheet, options.input);
    let styledNodes = requireOk(applyResult, 'css');
    const styledCount = styledNodes.reduce((acc, n) => acc + countHtmlNodes(n.node), 0);

    styledNodes = analyzeLayoutIntents(styledNodes);

    const responsiveMetadata = buildResponsiveMetadata(stylesheet);

    let hints;
    if (options.aiEnhance) {
      const { createAiDetector } = await import('@html-native/semantic-analyzer/ai');
      const aiDetector = createAiDetector(options.aiModel ? { model: options.aiModel } : undefined);
      hints = await aiDetector(styledNodes);
    } else {
      const semanticResult = detectSemantics(styledNodes);
      hints = requireOk(semanticResult, 'semantic');
    }
    spinners.succeed('Semantic Analysis');

    spinners.start('Accessibility Analysis');
    const a11yResult = analyzeAccessibility(styledNodes);
    const a11y = requireOk(a11yResult, 'accessibility');
    const a11yIssues = a11y.issues.length;
    spinners.succeed('Accessibility Analysis');

    spinners.start('IR Conversion');
    const rootStyled: StyledNode = {
      node: ast,
      styles: {},
      children: styledNodes,
      layoutIntent: { type: 'Stack', properties: {}, confidence: 1 },
    };
    const irResult = styledNodeToIr(rootStyled, hints, a11y.perNodeInfo);
    let ir = requireOk(irResult, 'ir');

    if (responsiveMetadata.breakpoints.length > 0) {
      ir = attachResponsiveMetadata(ir, responsiveMetadata);
    }

    if (options.aiEnhance) {
      ir = await enrichWithIntent(ir, { enabled: true, aiConfig: options.aiModel ? { model: options.aiModel } : undefined });
    } else {
      ir = enrichWithIntentSync(ir);
    }

    const componentsDetected = countComponentNodes(ir);
    spinners.succeed('IR Conversion');

    spinners.start('Optimization');
    const irBefore = structuredClone(ir);
    const optResult = optimize(ir);
    const optimized = requireOk(optResult, 'optimizer');
    const savings = computeOptimizationSavings(irBefore, optimized);
    spinners.succeed('Optimization');

    spinners.start('Code Generation');
    let generateResult: GenerateResult;
    switch (options.target) {
      case 'flutter': {
        const r = generateFlutter(optimized);
        if (!r.ok) throw new PipelineError(r.diagnostics);
        generateResult = r.value;
        break;
      }
      case 'compose': {
        const r = generateCompose(optimized);
        if (!r.ok) throw new PipelineError(r.diagnostics);
        generateResult = r.value;
        break;
      }
      case 'swiftui': {
        const r = generateSwiftUI(optimized);
        if (!r.ok) throw new PipelineError(r.diagnostics);
        generateResult = r.value;
        break;
      }
      default:
        throw new PipelineError([{
          code: 'PIPE_001',
          message: `Unknown target "${options.target}". Use flutter, compose, or swiftui.`,
          severity: 'error',
          phase: 'generator',
        }]);
    }
    spinners.succeed('Code Generation');

    const duration = (Date.now() - startTime) / 1000;

    const stats: ConversionStats = {
      htmlNodes: htmlNodeCount,
      styledNodes: styledCount,
      componentsDetected,
      optimizationSavings: savings,
      generatedLines: countLines(generateResult.code),
      target: options.target,
      duration,
    };

    return { code: generateResult.code, stats };
  } catch (err) {
    spinners.stopAll();
    if (err instanceof PipelineError) {
      throw err;
    }
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
