// packages/pipeline-core/src/index.ts

import { parseHtml } from '@html-native/parser';
import { parseCss, applyStyles, analyzeLayoutIntents, buildResponsiveMetadata } from '@html-native/css-analyzer';
import { detectSemantics } from '@html-native/semantic-analyzer';
import { styledNodeToIr, enrichWithIntentSync } from '@html-native/ir';
import { optimize } from '@html-native/optimizer';
import { generate as generateFlutter } from '@html-native/generator-flutter';
import { generate as generateCompose } from '@html-native/generator-compose';
import { generate as generateSwiftUI } from '@html-native/generator-swiftui';
import type { StyledNode } from '@html-native/shared';

export type Target = 'flutter' | 'compose' | 'swiftui';

export interface PipelineInput {
  html: string;
  css: string;
  target: Target;
}

export interface PipelineStats {
  htmlNodes: number;
  componentsDetected: number;
  generatedLines: number;
  target: Target;
  duration: number;
}

export interface PipelineResult {
  code: string;
  stats: PipelineStats;
}

const COMPONENT_TYPES = new Set([
  'Button', 'Card', 'NavigationBar', 'AppBar', 'Drawer',
  'HeroSection', 'Footer', 'Sidebar', 'Dialog', 'Modal',
  'Tabs', 'Form', 'TextField', 'TextArea', 'List',
]);

function countHtmlNodes(node: any): number {
  let count = 1;
  for (const child of node.children) count += countHtmlNodes(child);
  return count;
}

function countComponentNodes(node: any): number {
  let count = COMPONENT_TYPES.has(node.type) ? 1 : 0;
  for (const child of node.children) count += countComponentNodes(child);
  return count;
}

/**
 * Runs the full motarjim pipeline on in-memory HTML/CSS strings and
 * returns generated native code + stats. Shared by both the CLI and
 * the Web server so the two entry points can't drift apart.
 */
export function runPipeline(input: PipelineInput): PipelineResult {
  const { html, css, target } = input;
  const startTime = Date.now();

  const ast = parseHtml(html);
  const htmlNodes = countHtmlNodes(ast);

  const stylesheet = parseCss(css || '');
  let styledNodes: StyledNode[] = applyStyles(ast.children, stylesheet);
  styledNodes = analyzeLayoutIntents(styledNodes);

  const responsiveMeta = buildResponsiveMetadata(stylesheet);
  // TODO (parity bug from the review): find how the CLI attaches
  // `responsiveMeta` onto the IR and mirror that call here, right after
  // `enrichWithIntentSync` below. In the original web/server.ts this value
  // was computed but never attached — that's the divergence the reviewer
  // flagged. Don't guess at an attach function name; copy whatever the
  // CLI actually calls.

  const hints = detectSemantics(styledNodes);
  const rootStyled: StyledNode = {
    node: ast,
    styles: {},
    children: styledNodes,
    layoutIntent: { type: 'Stack', properties: {}, confidence: 1 },
  };

  let ir = styledNodeToIr(rootStyled, hints);
  ir = enrichWithIntentSync(ir);

  const componentsDetected = countComponentNodes(ir);
  const optimized = optimize(ir);

  let result;
  switch (target) {
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
      throw new Error(`Unknown target "${target}"`);
  }

  const duration = (Date.now() - startTime) / 1000;

  return {
    code: result.code,
    stats: {
      htmlNodes,
      componentsDetected,
      generatedLines: result.code.split('\n').length,
      target,
      duration,
    },
  };
}