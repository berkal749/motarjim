import { describe, it, expect, vi } from 'vitest';
import { createAiDetector } from '../packages/semantic-analyzer/ai.js';
import { detectSemantics } from '../packages/semantic-analyzer/index.js';
import { parseHtml } from '../packages/parser/index.js';
import { parseCss, applyStyles } from '../packages/css-analyzer/index.js';

describe('AI Enhancement Layer', () => {
  const html = '<nav class="navbar"><h1>Title</h1></nav><div class="card"><p>Content</p></div>';
  const css = '.navbar { background: #333; } .card { padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px; }';

  const parseResult = parseHtml(html);
  if (!parseResult.ok) throw new Error(parseResult.diagnostics.map(d => d.message).join(', '));
  const ast = parseResult.value;

  const cssResult = parseCss(css);
  if (!cssResult.ok) throw new Error(cssResult.diagnostics.map(d => d.message).join(', '));
  const sheet = cssResult.value;

  const applyResult = applyStyles(ast.children, sheet);
  if (!applyResult.ok) throw new Error(applyResult.diagnostics.map(d => d.message).join(', '));
  const styled = applyResult.value;

  it('falls back to rule-based detector when Ollama is unavailable', async () => {
    const detector = createAiDetector({ baseUrl: 'http://localhost:19999', timeout: 500 });
    const hints = await detector(styled);
    const semanticResult = detectSemantics(styled);
    if (!semanticResult.ok) throw new Error(semanticResult.diagnostics.map(d => d.message).join(', '));
    const ruleHints = semanticResult.value;
    expect(hints.length).toBeGreaterThanOrEqual(ruleHints.length);
  });

  it('works synchronously through the pipeline without AI flag', () => {
    const semanticResult = detectSemantics(styled);
    if (!semanticResult.ok) throw new Error(semanticResult.diagnostics.map(d => d.message).join(', '));
    const hints = semanticResult.value;
    expect(hints.length).toBeGreaterThan(0);
    expect(hints.some(h => h.type === 'NavigationBar')).toBe(true);
    expect(hints.some(h => h.type === 'Card')).toBe(true);
  });

  it('never generates platform code', () => {
    const semanticResult = detectSemantics(styled);
    if (!semanticResult.ok) throw new Error(semanticResult.diagnostics.map(d => d.message).join(', '));
    const hints = semanticResult.value;
    for (const hint of hints) {
      expect(hint.type).not.toMatch(/flutter|compose|swiftui|dart|kotlin|swift/i);
    }
  });
});
