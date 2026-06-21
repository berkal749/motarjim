// ============================================================
// IR v2 — HTML → Native UI Transformation Example
// ============================================================
//
// Run:  npx tsx packages/ir-v2/example.ts
//
// Full pipeline:  HTML + CSS → parse → cascade → IrNode
// ============================================================

import type { IrNode } from '@html-native/shared/ir-v2.js';
import { parseHtml } from '@html-native/parser';
import { parseCss, applyStyles, extractResponsiveHints } from '@html-native/css-analyzer';
import { styledNodeToIrV2 } from './index.js';

// ─── Input HTML & CSS ────────────────────────────────────────

const html = `
<div class="product-card">
  <img src="https://picsum.photos/200" alt="Product photo" />
  <div class="card-body">
    <h2>Wireless Headphones</h2>
    <p class="price">$79.99</p>
    <p class="description">Noise-cancelling, 30h battery life, USB-C.</p>
    <button class="btn-primary" aria-label="Add to cart">Add to Cart</button>
  </div>
</div>
`;

const css = `
.product-card {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  padding: 16px;
  gap: 12px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-width: 320px;
}

.product-card img {
  border-radius: 8px;
  width: 100%;
  height: auto;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.price {
  font-size: 24px;
  font-weight: 700;
  color: #2e7d32;
}

.description {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  border-radius: 8px;
  background-color: #1976d2;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
`;

// ─── Run pipeline ────────────────────────────────────────────

const parsed = parseHtml(html);
if (!parsed.ok) { console.error('Parse failed:', parsed.diagnostics); process.exit(1); }

const cssParsed = parseCss(css);
if (!cssParsed.ok) { console.error('CSS parse failed:', cssParsed.diagnostics); process.exit(1); }

const styled = applyStyles(parsed.value.children, cssParsed.value);
if (!styled.ok) { console.error('Style application failed:', styled.diagnostics); process.exit(1); }

const responsiveHints = extractResponsiveHints(cssParsed.value);

// ─── Transform to IR v2 ──────────────────────────────────────

const rvs = responsiveHints.map(h => ({
  breakpoint: { condition: h.condition, value: h.value },
  layoutOverrides: {},
  styleOverrides: {},
}));

const irTree = styled.value.map(sn => styledNodeToIrV2(sn, rvs));

// ─── Pretty-print ────────────────────────────────────────────

function inspect(node: IrNode, depth = 0): string {
  const pad = '  '.repeat(depth);
  const sem = node.semantics;
  const lay = node.layout;

  let line = `${pad}◈ IrNode(id="${node.id}", role="${sem.role}")`;

  // Semantic details
  switch (sem.role) {
    case 'text':
      line += `  text="${sem.content.slice(0, 50)}"`; break;
    case 'heading':
      line += `  h${sem.level}="${sem.content.slice(0, 40)}"`; break;
    case 'image':
      line += `  src="${sem.source}"  alt="${sem.alt}"`; break;
    case 'button':
      line += `  label="${sem.label}"  variant="${sem.variant}"`; break;
    case 'link':
      line += `  href="${sem.href}"`; break;
    case 'generic':
      line += '  (generic container)'; break;
  }

  // Layout details
  line += `\n${pad}  ├─ Layout: ${lay.strategy}`;
  if (lay.strategy === 'flex') {
    line += `  dir=${lay.direction}  wrap=${lay.wrap}  gap=${lay.gap}  jc=${lay.justifyContent}  ai=${lay.alignItems}`;
  } else if (lay.strategy === 'box') {
    line += `  sizing=${lay.sizing}`;
  } else if (lay.strategy === 'scroll') {
    line += `  axis=${lay.axis}`;
  } else if (lay.strategy === 'absolute') {
    line += `  z=${lay.zIndex}  pos=(${lay.position.top ?? '-'}, ${lay.position.right ?? '-'}, ${lay.position.bottom ?? '-'}, ${lay.position.left ?? '-'})`;
  }

  // Accessibility
  const a = node.accessibility;
  const aParts: string[] = [];
  if (a.label) aParts.push(`label="${a.label}"`);
  if (a.hint) aParts.push(`hint="${a.hint}"`);
  if (a.hidden) aParts.push('hidden');
  if (a.focusable) aParts.push('focusable');
  if (a.liveRegion) aParts.push(`live=${a.liveRegion}`);
  if (aParts.length > 0) line += `\n${pad}  └─ A11y: ${aParts.join(', ')}`;

  const lines = [line];
  for (const child of node.children) lines.push(inspect(child, depth + 1));
  return lines.join('\n');
}

console.log('═══════════════════════════════════════════════════════');
console.log('  IR v2 — Three-Layer Intermediate Representation');
console.log('  HTML → Semantic · Layout · Target');
console.log('═══════════════════════════════════════════════════════\n');

for (const node of irTree) {
  console.log(inspect(node));
  console.log();
}

console.log('───────────────────────────────────────────────────────');
console.log('  Legend');
console.log('    ◈  IR node (id, semantic role)');
console.log('    ├─ Layout strategy + parameters');
console.log('    └─ Accessibility metadata (when present)');
console.log('───────────────────────────────────────────────────────');
