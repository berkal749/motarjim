// Benchmark: measures parse + compile time for ~1000-node HTML documents.
// Target: under 500ms total pipeline time.
// Usage: npx tsx tests/benchmark.ts

import { parseHtml, parseFragment } from '../packages/parser/index.js';
import { parseCss, applyStyles } from '../packages/css-analyzer/index.js';
import { detectSemantics } from '../packages/semantic-analyzer/index.js';
import { styledNodeToIr } from '../packages/ir/index.js';
import { optimize } from '../packages/optimizer/index.js';
import { generate as generateFlutter } from '../packages/generators/flutter/index.js';
import { generate as generateCompose } from '../packages/generators/compose/index.js';
import { generate as generateSwiftUI } from '../packages/generators/swiftui/index.js';

function generateLargeHtml(nodeCount: number): { html: string; css: string } {
  const items: string[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const variant = i % 4;
    switch (variant) {
      case 0:
        items.push(`<div class="card"><h2>Card ${i}</h2><p>Description for card number ${i}</p><button>Action ${i}</button></div>`);
        break;
      case 1:
        items.push(`<section class="hero"><h1>Hero Section ${i}</h1><p>Hero text ${i}</p></section>`);
        break;
      case 2:
        items.push(`<nav class="navbar"><div class="container"><h1>Nav ${i}</h1><ul><li><a href="/">Home</a></li><li><a href="/about">About</a></li></ul></div></nav>`);
        break;
      case 3:
        items.push(`<form class="form-${i}"><input type="text" placeholder="Name ${i}" /><textarea placeholder="Message ${i}"></textarea><button type="submit">Send ${i}</button></form>`);
        break;
    }
  }
  const html = `<div class="container">${items.join('\n')}</div>`;
  const css = `
    .container { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .card { padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card h2 { font-size: 18px; color: #333; }
    .card p { font-size: 14px; color: #666; }
    .card button { background: blue; color: white; border-radius: 4px; }
    .hero { padding: 40px; text-align: center; background: #1a1a2e; color: white; }
    .hero h1 { font-size: 32px; }
    .navbar { background: #333; color: white; padding: 12px; }
    .navbar .container { display: flex; justify-content: space-between; }
    .navbar ul { display: flex; gap: 16px; list-style: none; }
    input, textarea { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    @media (min-width: 768px) { .container { padding: 32px; } }
    @media (max-width: 600px) { .card { padding: 8px; } }
  `;
  return { html, css };
}

function measure<T>(label: string, fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  return { result, duration };
}

function countHtmlNodes(html: string): number {
  return (html.match(/<div|<section|<nav|<form|<h[12]|<p|<button|<input|<textarea|<ul|<li|<a/g) || []).length;
}

console.log('=== html-native-engine Benchmark ===\n');

// Warm-up
const warmup = generateLargeHtml(50);
parseHtml(warmup.html);
parseCss(warmup.css);

// Run benchmarks at different scales
for (const scale of [100, 500, 1000]) {
  const { html, css } = generateLargeHtml(scale);
  const nodeCount = countHtmlNodes(html);
  console.log(`--- ${scale} items (~${nodeCount} HTML nodes) ---`);

  // Phase 1: Parsing
  const { result: ast, duration: parseTime } = measure('parseHtml', () => parseHtml(html));
  console.log(`  Parse HTML:         ${parseTime.toFixed(1)}ms`);

  // Phase 2: CSS
  const { result: sheet, duration: cssTime } = measure('parseCss', () => parseCss(css));
  console.log(`  Parse CSS:          ${cssTime.toFixed(1)}ms`);

  // Phase 3: Style application + semantics
  const { result: styled, duration: styleTime } = measure('applyStyles', () => applyStyles(ast.children, sheet));
  console.log(`  Apply styles:       ${styleTime.toFixed(1)}ms`);

  const { duration: semanticTime } = measure('detectSemantics', () => detectSemantics(styled));
  console.log(`  Semantic analysis:  ${semanticTime.toFixed(1)}ms`);

  // Phase 4: IR conversion
  const rootStyled = { node: ast, styles: {}, children: styled };
  const { result: ir, duration: irTime } = measure('styledNodeToIr', () => styledNodeToIr(rootStyled));
  console.log(`  IR conversion:      ${irTime.toFixed(1)}ms`);

  // Phase 5: Optimization
  const { result: optimized, duration: optTime } = measure('optimize', () => optimize(ir));
  console.log(`  Optimization:       ${optTime.toFixed(1)}ms`);

  // Phase 6: Code generation
  const { duration: flTime } = measure('generateFlutter', () => generateFlutter(optimized));
  console.log(`  Flutter gen:        ${flTime.toFixed(1)}ms`);

  const { duration: coTime } = measure('generateCompose', () => generateCompose(optimized));
  console.log(`  Compose gen:        ${coTime.toFixed(1)}ms`);

  const { duration: swTime } = measure('generateSwiftUI', () => generateSwiftUI(optimized));
  console.log(`  SwiftUI gen:        ${swTime.toFixed(1)}ms`);

  const totalPipeline = parseTime + cssTime + styleTime + semanticTime + irTime + optTime + flTime;
  const totalWithAll = totalPipeline + coTime + swTime;
  console.log(`  TOTAL (single gen): ${totalPipeline.toFixed(1)}ms`);
  console.log(`  TOTAL (all 3 gens): ${totalWithAll.toFixed(1)}ms`);
  console.log(`  Target:             < 500ms ${totalPipeline < 500 ? '✓ PASS' : '✗ FAIL'}`);
  console.log('');
}

// Count the actual pipeline nodes for the 1000-item case
{
  const { html, css } = generateLargeHtml(1000);
  const ast = parseHtml(html);
  const sheet = parseCss(css);
  const styled = applyStyles(ast.children, sheet);
  const root = { node: ast, styles: {}, children: styled };
  const ir = styledNodeToIr(root);
  const opt = optimize(ir);

  function countUiNodes(node: { children: any[] }): number {
    return 1 + node.children.reduce((sum, c) => sum + countUiNodes(c), 0);
  }
  console.log(`IR node count (1000 items): ${countUiNodes(opt)}`);
}
