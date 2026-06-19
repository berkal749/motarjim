import { bench, describe } from 'vitest';
import { parseHtml } from '../packages/parser/index.js';
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
    const v = i % 4;
    if (v === 0) items.push(`<div class="card"><h2>Card ${i}</h2><p>Desc ${i}</p><button>A</button></div>`);
    else if (v === 1) items.push(`<section class="hero"><h1>Hero ${i}</h1><p>Text ${i}</p></section>`);
    else if (v === 2) items.push(`<nav><h1>Nav ${i}</h1><ul><li>Item</li></ul></nav>`);
    else items.push(`<form><input /><button>Send</button></form>`);
  }
  return {
    html: `<div class="container">${items.join('')}</div>`,
    css: '.card { padding: 16px; border-radius: 8px; } .hero { padding: 40px; text-align: center; } nav { background: #333; }',
  };
}

const { html, css } = generateLargeHtml(1000);

describe('Full pipeline benchmark (1000 items)', () => {
  bench('parseHtml', () => { parseHtml(html); });
  bench('parseCss', () => { parseCss(css); });

  let ast: ReturnType<typeof parseHtml>;
  let sheet: ReturnType<typeof parseCss>;
  bench('applyStyles + semantics + IR', () => {
    ast = parseHtml(html);
    sheet = parseCss(css);
    const styled = applyStyles(ast.children, sheet);
    const hints = detectSemantics(styled);
    const root = { node: ast, styles: {}, children: styled };
    styledNodeToIr(root, hints);
  });

  let ir: ReturnType<typeof styledNodeToIr>;
  bench('full pipeline (Flutter)', () => {
    ast = parseHtml(html);
    sheet = parseCss(css);
    const styled = applyStyles(ast.children, sheet);
    const hints = detectSemantics(styled);
    const root = { node: ast, styles: {}, children: styled };
    ir = styledNodeToIr(root, hints);
    const opt = optimize(ir);
    generateFlutter(opt);
  });
});
