import { describe, it, expect } from 'vitest';
import { parseCss, matchSelector, resolveStyles, extractResponsiveHints } from '../packages/css-analyzer/index.js';

describe('CSS Analyzer', () => {
  it('parses simple CSS rules', () => {
    const css = '.btn { color: red; font-size: 16px; }';
    const sheet = parseCss(css);
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
    const sheet = parseCss(css);
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
    const sheet = parseCss(css);
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
      const sheet = parseCss(css);
      expect(sheet.rules).toHaveLength(1);
      expect(sheet.rules[0].declarations).toHaveLength(2);
    });

    it('handles @import statements (ignores them gracefully)', () => {
      const css = '@import url("other.css"); .a { color: red; }';
      const sheet = parseCss(css);
      expect(sheet.rules).toHaveLength(1);
    });

    it('handles empty input', () => {
      const sheet = parseCss('');
      expect(sheet.rules).toHaveLength(0);
      expect(sheet.mediaQueries).toHaveLength(0);
    });

    it('handles whitespace-only input', () => {
      const sheet = parseCss('   \n  ');
      expect(sheet.rules).toHaveLength(0);
    });
  });

  describe('Media queries', () => {
    it('parses @media rules into mediaQueries', () => {
      const css = '@media (min-width: 768px) { .card { padding: 24px; } }';
      const sheet = parseCss(css);
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
      const sheet = parseCss(css);
      expect(sheet.mediaQueries).toHaveLength(1);
      expect(sheet.mediaQueries[0].rules).toHaveLength(2);
    });

    it('does not add non-media at-rules as mediaQueries', () => {
      const css = '@font-face { font-family: "Test"; } .a { color: red; }';
      const sheet = parseCss(css);
      expect(sheet.mediaQueries).toHaveLength(0);
      expect(sheet.rules).toHaveLength(1);
    });

    it('handles complex media conditions', () => {
      const css = '@media (min-width: 1024px) and (max-width: 1440px) { .grid { gap: 32px; } }';
      const sheet = parseCss(css);
      expect(sheet.mediaQueries).toHaveLength(1);
      expect(sheet.mediaQueries[0].condition).toContain('and');
    });
  });

  describe('extractResponsiveHints', () => {
    it('extracts min-width responsive hints', () => {
      const css = '@media (min-width: 768px) { .card { padding: 24px; color: red; } }';
      const sheet = parseCss(css);
      const hints = extractResponsiveHints(sheet);
      expect(hints.length).toBe(1);
      expect(hints[0].condition).toBe('min-width');
      expect(hints[0].value).toBe('768px');
      expect(hints[0].breakpoint).toContain('768px');
    });

    it('extracts max-width responsive hints', () => {
      const css = '@media (max-width: 600px) { .container { flex-direction: column; } }';
      const sheet = parseCss(css);
      const hints = extractResponsiveHints(sheet);
      expect(hints.length).toBe(1);
      expect(hints[0].condition).toBe('max-width');
      expect(hints[0].value).toBe('600px');
      expect(hints[0].styles['flex-direction']).toBe('column');
    });

    it('returns empty array when no media queries', () => {
      const sheet = parseCss('.a { color: red; }');
      const hints = extractResponsiveHints(sheet);
      expect(hints).toEqual([]);
    });
  });
});
