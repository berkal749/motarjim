import { describe, it, expect } from 'vitest';
import {
  parseCss,
  matchSelector,
  resolveStyles,
  extractResponsiveHints,
  parseSelector,
  parseSelectorList,
  calculateSpecificity,
  matchAst,
  matchSelectorString,
  parseInlineStyles,
  cascadeStyles,
  createParentResolver,
  inheritMissingProperties,
  INHERITED_PROPERTIES,
} from '../packages/css-analyzer/index.js';

function getCss(css: string) {
  const r = parseCss(css);
  if (!r.ok) throw new Error(r.diagnostics.map(d => d.message).join(', '));
  return r.value;
}

describe('CSS Analyzer', () => {
  it('parses simple CSS rules', () => {
    const css = '.btn { color: red; font-size: 16px; }';
    const sheet = getCss(css);
    expect(sheet.rules).toHaveLength(1);
    expect(sheet.rules[0].selectors).toEqual(['.btn']);
    expect(sheet.rules[0].declarations).toHaveLength(2);
  });

  it('matches class selectors', () => {
    const node = {
      nodeId: '1',
      tagName: 'div',
      attributes: [{ name: 'class', value: 'btn primary' }],
      children: [],
    };
    expect(matchSelector('.btn', node)).toBe(true);
    expect(matchSelector('.primary', node)).toBe(true);
    expect(matchSelector('.nonexistent', node)).toBe(false);
  });

  it('matches tag selectors', () => {
    const node = {
      nodeId: '1',
      tagName: 'button',
      attributes: [],
      children: [],
    };
    expect(matchSelector('button', node)).toBe(true);
    expect(matchSelector('div', node)).toBe(false);
  });

  it('matches id selectors', () => {
    const node = {
      nodeId: '1',
      tagName: 'div',
      attributes: [{ name: 'id', value: 'main' }],
      children: [],
    };
    expect(matchSelector('#main', node)).toBe(true);
    expect(matchSelector('#other', node)).toBe(false);
  });

  it('matches universal selector', () => {
    const node = {
      nodeId: '1',
      tagName: 'div',
      attributes: [],
      children: [],
    };
    expect(matchSelector('*', node)).toBe(true);
  });

  it('resolves styles for a node', () => {
    const css = '.card { padding: 16px; background: white; border-radius: 8px; }';
    const sheet = getCss(css);
    const node = {
      nodeId: '1',
      tagName: 'div',
      attributes: [{ name: 'class', value: 'card' }],
      children: [],
    };
    const styles = resolveStyles(node, sheet);
    expect(styles['padding']).toBe('16px');
    expect(styles['background']).toBe('white');
    expect(styles['border-radius']).toBe('8px');
  });

  it('handles multiple rules', () => {
    const css = 'h1 { font-size: 32px; } h1 { color: blue; }';
    const sheet = getCss(css);
    const node = {
      nodeId: '1',
      tagName: 'h1',
      attributes: [],
      children: [],
    };
    const styles = resolveStyles(node, sheet);
    expect(styles['font-size']).toBe('32px');
    expect(styles['color']).toBe('blue');
  });

  describe('PostCSS features', () => {
    it('handles vendor prefixes', () => {
      const css = '.box { -webkit-border-radius: 8px; border-radius: 8px; }';
      const sheet = getCss(css);
      expect(sheet.rules).toHaveLength(1);
      expect(sheet.rules[0].declarations).toHaveLength(2);
    });

    it('handles @import statements (ignores them gracefully)', () => {
      const css = '@import url("other.css"); .a { color: red; }';
      const sheet = getCss(css);
      expect(sheet.rules).toHaveLength(1);
    });

    it('handles empty input', () => {
      const sheet = getCss('');
      expect(sheet.rules).toHaveLength(0);
      expect(sheet.mediaQueries).toHaveLength(0);
    });

    it('handles whitespace-only input', () => {
      const sheet = getCss('   \n  ');
      expect(sheet.rules).toHaveLength(0);
    });
  });

  describe('Media queries', () => {
    it('parses @media rules into mediaQueries', () => {
      const css = '@media (min-width: 768px) { .card { padding: 24px; } }';
      const sheet = getCss(css);
      expect(sheet.mediaQueries).toHaveLength(1);
      expect(sheet.mediaQueries[0].condition).toContain('min-width: 768px');
      expect(sheet.mediaQueries[0].rules).toHaveLength(1);
      expect(sheet.mediaQueries[0].rules[0].selectors[0]).toBe('.card');
    });

    it('handles multiple media query rules', () => {
      const css = `@media (max-width: 600px) {
        .container { flex-direction: column; }
        .nav { display: none; }
      }`;
      const sheet = getCss(css);
      expect(sheet.mediaQueries).toHaveLength(1);
      expect(sheet.mediaQueries[0].rules).toHaveLength(2);
    });

    it('does not add non-media at-rules as mediaQueries', () => {
      const css = '@font-face { font-family: "Test"; } .a { color: red; }';
      const sheet = getCss(css);
      expect(sheet.mediaQueries).toHaveLength(0);
      expect(sheet.rules).toHaveLength(1);
    });

    it('handles complex media conditions', () => {
      const css = '@media (min-width: 1024px) and (max-width: 1440px) { .grid { gap: 32px; } }';
      const sheet = getCss(css);
      expect(sheet.mediaQueries).toHaveLength(1);
      expect(sheet.mediaQueries[0].condition).toContain('and');
    });
  });

  describe('extractResponsiveHints', () => {
    it('extracts min-width responsive hints', () => {
      const css = '@media (min-width: 768px) { .card { padding: 24px; color: red; } }';
      const sheet = getCss(css);
      const hints = extractResponsiveHints(sheet);
      expect(hints.length).toBe(1);
      expect(hints[0].condition).toBe('min-width');
      expect(hints[0].value).toBe('768px');
      expect(hints[0].breakpoint).toContain('768px');
    });

    it('extracts max-width responsive hints', () => {
      const css = '@media (max-width: 600px) { .container { flex-direction: column; } }';
      const sheet = getCss(css);
      const hints = extractResponsiveHints(sheet);
      expect(hints.length).toBe(1);
      expect(hints[0].condition).toBe('max-width');
      expect(hints[0].value).toBe('600px');
      expect(hints[0].styles['flex-direction']).toBe('column');
    });

    it('returns empty array when no media queries', () => {
      const sheet = getCss('.a { color: red; }');
      const hints = extractResponsiveHints(sheet);
      expect(hints).toEqual([]);
    });
  });

  describe('Selector AST', () => {
    it('parses tag selector', () => {
      const ast = parseSelector('div');
      expect(ast).not.toBeNull();
      expect(ast).toHaveProperty('simples');
      expect((ast as any).simples).toEqual([{ type: 'tag', value: 'div' }]);
    });

    it('parses class selector', () => {
      const ast = parseSelector('.btn');
      expect(ast).not.toBeNull();
      expect((ast as any).simples[0].type).toBe('class');
      expect((ast as any).simples[0].value).toBe('btn');
    });

    it('parses id selector', () => {
      const ast = parseSelector('#header');
      expect(ast).not.toBeNull();
      expect((ast as any).simples[0].type).toBe('id');
      expect((ast as any).simples[0].value).toBe('header');
    });

    it('parses universal selector', () => {
      const ast = parseSelector('*');
      expect(ast).not.toBeNull();
      expect((ast as any).simples[0].type).toBe('universal');
    });

    it('parses compound selector', () => {
      const ast = parseSelector('div.card#main');
      expect(ast).not.toBeNull();
      const simples = (ast as any).simples;
      expect(simples).toHaveLength(3);
      expect(simples[0]).toEqual({ type: 'tag', value: 'div' });
      expect(simples[1]).toEqual({ type: 'class', value: 'card' });
      expect(simples[2]).toEqual({ type: 'id', value: 'main' });
    });

    it('parses attribute selectors', () => {
      const ast = parseSelector('[type="text"]');
      expect(ast).not.toBeNull();
      const s = (ast as any).simples[0];
      expect(s.type).toBe('attribute');
      expect(s.value).toBe('type');
      expect(s.operator).toBe('=');
      expect(s.compareValue).toBe('text');
    });

    it('parses attribute presence selector', () => {
      const ast = parseSelector('[disabled]');
      expect(ast).not.toBeNull();
      const s = (ast as any).simples[0];
      expect(s.type).toBe('attribute');
      expect(s.value).toBe('disabled');
      expect(s.operator).toBeUndefined();
    });

    it('parses descendant combinator', () => {
      const ast = parseSelector('div .btn');
      expect(ast).not.toBeNull();
      expect(ast).not.toHaveProperty('simples');
      const rel = ast as any;
      expect(rel.combinator).toBe('descendant');
      expect(rel.right.simples[0].value).toBe('btn');
    });

    it('parses child combinator', () => {
      const ast = parseSelector('div > .btn');
      expect(ast).not.toBeNull();
      expect((ast as any).combinator).toBe('child');
    });

    it('parses adjacent sibling combinator', () => {
      const ast = parseSelector('h2 + p');
      expect(ast).not.toBeNull();
      expect((ast as any).combinator).toBe('adjacent-sibling');
    });

    it('parses general sibling combinator', () => {
      const ast = parseSelector('h2 ~ p');
      expect(ast).not.toBeNull();
      expect((ast as any).combinator).toBe('general-sibling');
    });

    it('parses selector list', () => {
      const asts = parseSelectorList('div, .btn, #main');
      expect(asts).toHaveLength(3);
    });

    it('returns null for empty selector', () => {
      expect(parseSelector('')).toBeNull();
    });
  });

  describe('Specificity', () => {
    it('tag specificity is (0,0,1)', () => {
      const ast = parseSelector('div')!;
      expect(calculateSpecificity(ast)).toEqual({ id: 0, class: 0, tag: 1 });
    });

    it('class specificity is (0,1,0)', () => {
      const ast = parseSelector('.btn')!;
      expect(calculateSpecificity(ast)).toEqual({ id: 0, class: 1, tag: 0 });
    });

    it('id specificity is (1,0,0)', () => {
      const ast = parseSelector('#header')!;
      expect(calculateSpecificity(ast)).toEqual({ id: 1, class: 0, tag: 0 });
    });

    it('compound selector sums specificity', () => {
      const ast = parseSelector('div.card#main')!;
      expect(calculateSpecificity(ast)).toEqual({ id: 1, class: 1, tag: 1 });
    });

    it('descendant selector sums both sides', () => {
      const ast = parseSelector('div .btn')!;
      expect(calculateSpecificity(ast)).toEqual({ id: 0, class: 1, tag: 1 });
    });

    it('attribute selector gets class-level specificity', () => {
      const ast = parseSelector('[type="text"]')!;
      expect(calculateSpecificity(ast)).toEqual({ id: 0, class: 1, tag: 0 });
    });
  });

  describe('Selector matching', () => {
    const btn = { nodeId: '1', tagName: 'button', attributes: [{ name: 'class', value: 'btn primary' }], children: [] };
    const card = { nodeId: '2', tagName: 'div', attributes: [{ name: 'class', value: 'card' }, { name: 'id', value: 'main' }], children: [] };
    const parent = { nodeId: '3', tagName: 'div', attributes: [{ name: 'class', value: 'container' }], children: [card] };

    it('matches tag selector', () => {
      expect(matchSelectorString('button', btn)).toBe(true);
      expect(matchSelectorString('div', btn)).toBe(false);
    });

    it('matches class selector', () => {
      expect(matchSelectorString('.btn', btn)).toBe(true);
      expect(matchSelectorString('.primary', btn)).toBe(true);
      expect(matchSelectorString('.nonexistent', btn)).toBe(false);
    });

    it('matches id selector', () => {
      expect(matchSelectorString('#main', card)).toBe(true);
      expect(matchSelectorString('#other', card)).toBe(false);
    });

    it('matches compound selector', () => {
      expect(matchSelectorString('div.card', card)).toBe(true);
      expect(matchSelectorString('button.card', card)).toBe(false);
    });

    it('matches descendant selector', () => {
      card.attributes = [{ name: 'class', value: 'card' }];
      const getParent = createParentResolver([parent]);
      expect(matchSelectorString('div .card', card, getParent)).toBe(true);
      expect(matchSelectorString('span .card', card, getParent)).toBe(false);
    });

    it('matches child selector', () => {
      const getParent = createParentResolver([parent]);
      expect(matchSelectorString('div > .card', card, getParent)).toBe(true);
      expect(matchSelectorString('span > .card', card, getParent)).toBe(false);
    });

    it('matches attribute selector', () => {
      const node = { nodeId: '1', tagName: 'input', attributes: [{ name: 'type', value: 'text' }], children: [] };
      expect(matchSelectorString('[type="text"]', node)).toBe(true);
      expect(matchSelectorString('[type="password"]', node)).toBe(false);
    });

    it('matches attribute presence selector', () => {
      const node = { nodeId: '1', tagName: 'button', attributes: [{ name: 'disabled', value: '' }], children: [] };
      expect(matchSelectorString('[disabled]', node)).toBe(true);
    });
  });

  describe('Cascade rules', () => {
    it('specificity overrides source order', () => {
      const css = '.foo { color: red; } div { color: blue; }';
      const sheet = getCss(css);
      const node = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'foo' }], children: [] };
      const styles = resolveStyles(node, sheet);
      expect(styles['color']).toBe('red');
    });

    it('source order wins for equal specificity', () => {
      const css = '.a { color: red; } .b { color: blue; }';
      const sheet = getCss(css);
      const node = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'a b' }], children: [] };
      const styles = resolveStyles(node, sheet);
      expect(styles['color']).toBe('blue');
    });

    it('id beats class regardless of order', () => {
      const css = '.foo { color: red; } #bar { color: blue; }';
      const sheet = getCss(css);
      const node = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'foo' }, { name: 'id', value: 'bar' }], children: [] };
      const styles = resolveStyles(node, sheet);
      expect(styles['color']).toBe('blue');
    });
  });

  describe('!important', () => {
    it('!important overrides non-important of same specificity', () => {
      const css = '.foo { color: red; } .bar { color: blue !important; }';
      const sheet = getCss(css);
      const node = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'foo bar' }], children: [] };
      const styles = resolveStyles(node, sheet);
      expect(styles['color']).toBe('blue');
    });

    it('!important overrides higher-specificity non-important', () => {
      const css = '.foo { color: red; } #x { color: blue !important; }';
      const sheet = getCss(css);
      const node = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'foo' }, { name: 'id', value: 'x' }], children: [] };
      const styles = resolveStyles(node, sheet);
      expect(styles['color']).toBe('blue');
    });

    it('!important later rule beats !important earlier rule', () => {
      const css = '.a { color: red !important; } .b { color: blue !important; }';
      const sheet = getCss(css);
      const node = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'a b' }], children: [] };
      const styles = resolveStyles(node, sheet);
      expect(styles['color']).toBe('blue');
    });
  });

  describe('Inline styles', () => {
    it('inline styles override stylesheet rules', () => {
      const css = '.foo { color: red; }';
      const sheet = getCss(css);
      const node = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'foo' }, { name: 'style', value: 'color: blue' }], children: [] };
      const styles = resolveStyles(node, sheet);
      expect(styles['color']).toBe('blue');
    });

    it('!important stylesheet beats non-important inline', () => {
      const css = '.foo { color: red !important; }';
      const sheet = getCss(css);
      const node = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'foo' }, { name: 'style', value: 'color: blue' }], children: [] };
      const styles = resolveStyles(node, sheet);
      expect(styles['color']).toBe('red');
    });

    it('parses inline style values', () => {
      const decls = parseInlineStyles('color: red; font-size: 16px');
      expect(decls).toHaveLength(2);
      expect(decls[0]).toEqual({ property: 'color', value: 'red', important: false });
      expect(decls[1]).toEqual({ property: 'font-size', value: '16px', important: false });
    });

    it('parses !important in inline styles', () => {
      const decls = parseInlineStyles('color: red !important');
      expect(decls).toHaveLength(1);
      expect(decls[0].property).toBe('color');
      expect(decls[0].value).toBe('red');
      expect(decls[0].important).toBe(true);
    });
  });

  describe('Inheritance', () => {
    it('child inherits color from parent', () => {
      const css = '.parent { color: red; }';
      const sheet = getCss(css);
      const child = { nodeId: '2', tagName: 'span', attributes: [], children: [] };
      const parent = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'parent' }], children: [child] };
      const getParent = createParentResolver([parent]);
      const parentStyles = cascadeStyles(parent, sheet, getParent, null);
      const childStyles = cascadeStyles(child, sheet, getParent, parentStyles);
      expect(childStyles['color']).toBe('red');
    });

    it('child explicit style overrides inherited', () => {
      const css = '.parent { color: red; } .child { color: blue; }';
      const sheet = getCss(css);
      const child = { nodeId: '2', tagName: 'span', attributes: [{ name: 'class', value: 'child' }], children: [] };
      const parent = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'parent' }], children: [child] };
      const getParent = createParentResolver([parent]);
      const parentStyles = cascadeStyles(parent, sheet, getParent, null);
      const childStyles = cascadeStyles(child, sheet, getParent, parentStyles);
      expect(childStyles['color']).toBe('blue');
    });

    it('non-inherited property is not inherited', () => {
      const css = '.parent { border: 1px solid black; }';
      const sheet = getCss(css);
      const child = { nodeId: '2', tagName: 'span', attributes: [], children: [] };
      const parent = { nodeId: '1', tagName: 'div', attributes: [{ name: 'class', value: 'parent' }], children: [child] };
      const getParent = createParentResolver([parent]);
      const parentStyles = cascadeStyles(parent, sheet, getParent, null);
      const childStyles = cascadeStyles(child, sheet, getParent, parentStyles);
      expect(childStyles['border']).toBeUndefined();
    });

    it('INHERITED_PROPERTIES contains text properties', () => {
      expect(INHERITED_PROPERTIES.has('color')).toBe(true);
      expect(INHERITED_PROPERTIES.has('font-size')).toBe(true);
      expect(INHERITED_PROPERTIES.has('font-family')).toBe(true);
      expect(INHERITED_PROPERTIES.has('border')).toBe(false);
    });
  });
});
