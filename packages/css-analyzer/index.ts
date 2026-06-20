// CSS analyzer using PostCSS for proper parsing with media query support.
// Maintains the same external API: parseCss(), matchSelector(), resolveStyles(), applyStyles().

import postcss from 'postcss';
import { CssStylesheet, CssRule, CssMediaQuery, HtmlNode, ResolvedStyles, StyledNode, ResponsiveHint } from '@html-native/shared';

export { detectLayoutIntent, analyzeLayoutIntents, describeLayout, LAYOUT_PATTERNS } from './intent.js';
export {
  extractBreakpoints,
  detectMobileFirst,
  buildResponsiveMetadata,
  detectResponsivePatterns,
  classifyBreakpoint,
  BREAKPOINT_LABELS,
} from './responsive.js';
export type { ResponsivePattern } from './responsive.js';

function parseDeclarations(declNodes: postcss.ChildNode[]): CssRule['declarations'] {
  const declarations: CssRule['declarations'] = [];
  for (const decl of declNodes) {
    if (decl.type === 'decl') {
      declarations.push({
        property: decl.prop,
        value: decl.value.replace(/!important\s*$/, '').trim(),
        important: decl.important,
      });
    }
  }
  return declarations;
}

function parseSelectors(selector: string): string[] {
  return selector.split(',').map(s => s.trim()).filter(Boolean);
}

export function parseCss(css: string): CssStylesheet {
  const result: CssStylesheet = { rules: [], mediaQueries: [] };

  if (!css.trim()) return result;

  let root: postcss.Root;
  try {
    root = postcss.parse(css);
  } catch {
    console.warn('Failed to parse CSS, returning empty stylesheet');
    return result;
  }

  for (const node of root.nodes) {
    if (node.type === 'rule' && node.nodes) {
      for (const sel of parseSelectors(node.selector)) {
        result.rules.push({
          selectors: [sel],
          declarations: parseDeclarations(node.nodes),
        });
      }
    } else if (node.type === 'atrule' && node.name === 'media' && node.nodes) {
      const mediaRules: CssRule[] = [];
      for (const child of node.nodes) {
        if (child.type === 'rule' && child.nodes) {
          for (const sel of parseSelectors(child.selector)) {
            mediaRules.push({
              selectors: [sel],
              declarations: parseDeclarations(child.nodes),
            });
          }
        }
      }
      if (mediaRules.length > 0) {
        result.mediaQueries.push({
          condition: node.params,
          rules: mediaRules,
        });
      }
    }
  }

  return result;
}

export function extractResponsiveHints(stylesheet: CssStylesheet): ResponsiveHint[] {
  const hints: ResponsiveHint[] = [];

  for (const mq of stylesheet.mediaQueries) {
    const condition = mq.condition;
    const minMatch = condition.match(/min-width\s*:\s*([^)\s]+)/);
    const maxMatch = condition.match(/max-width\s*:\s*([^)\s]+)/);
    const minHMatch = condition.match(/min-height\s*:\s*([^)\s]+)/);
    const maxHMatch = condition.match(/max-height\s*:\s*([^)\s]+)/);

    let conditionType: ResponsiveHint['condition'] | null = null;
    let value = '';

    if (minMatch) { conditionType = 'min-width'; value = minMatch[1]; }
    else if (maxMatch) { conditionType = 'max-width'; value = maxMatch[1]; }
    else if (minHMatch) { conditionType = 'min-height'; value = minHMatch[1]; }
    else if (maxHMatch) { conditionType = 'max-height'; value = maxHMatch[1]; }

    if (conditionType) {
      for (const rule of mq.rules) {
        const styles: ResolvedStyles = {};
        for (const decl of rule.declarations) {
          styles[decl.property] = decl.value;
        }
        hints.push({
          breakpoint: `${conditionType}: ${value}`,
          condition: conditionType,
          value,
          styles,
        });
      }
    }
  }

  return hints;
}

export function matchSelector(selector: string, node: HtmlNode): boolean {
  if (selector === '*') return true;
  if (selector.startsWith('.')) {
    const cls = selector.slice(1);
    const classAttr = node.attributes.find(a => a.name === 'class');
    return classAttr?.value.split(/\s+/).includes(cls) || false;
  }
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    const idAttr = node.attributes.find(a => a.name === 'id');
    return idAttr?.value === id || false;
  }
  return selector === node.tagName;
}

export function resolveStyles(node: HtmlNode, stylesheet: CssStylesheet): ResolvedStyles {
  const styles: ResolvedStyles = {};
  for (const rule of stylesheet.rules) {
    for (const selector of rule.selectors) {
      if (matchSelector(selector, node)) {
        for (const decl of rule.declarations) {
          styles[decl.property] = decl.value;
        }
      }
    }
  }
  return styles;
}

export function applyStyles(nodes: HtmlNode[], stylesheet: CssStylesheet): StyledNode[] {
  function apply(nodes: HtmlNode[]): StyledNode[] {
    return nodes.map(node => ({
      node,
      styles: resolveStyles(node, stylesheet),
      children: apply(node.children),
    }));
  }
  return apply(nodes);
}
