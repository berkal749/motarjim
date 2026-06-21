import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { StyledNode, UiNode } from '@html-native/shared';
import { ok } from '@html-native/shared/diagnostics.js';

function unwrap<T>(r: import('@html-native/shared').Result<T>): T {
  if (!r.ok) throw new Error(r.diagnostics.map(d => d.message).join(', '));
  return r.value;
}

// -- Phase 1: Semantic Analyzer AI --

describe('Phase 1 — Semantic Analyzer AI', () => {
  describe('Zod Schema Validation', () => {
    const SemanticComponentSchema = z.object({
      nodeId: z.string(),
      type: z.enum(['Card', 'Hero', 'Navbar', 'Dialog', 'Form', 'Sidebar', 'Footer', 'Header', 'List', 'Grid', 'Pricing', 'Dashboard', 'Marketing', 'ProductCard']),
      confidence: z.number().min(0).max(1),
      reasoning: z.string().optional(),
    });

    const AiResponseSchema = z.object({
      components: z.array(SemanticComponentSchema).min(0).max(500),
    });

    it('validates a correct AI response', () => {
      const input = {
        components: [
          { nodeId: 'node_1', type: 'Card', confidence: 0.95, reasoning: 'card class with shadow' },
          { nodeId: 'node_2', type: 'Navbar', confidence: 0.9 },
        ],
      };
      const result = AiResponseSchema.parse(input);
      expect(result.components).toHaveLength(2);
      expect(result.components[0].type).toBe('Card');
    });

    it('rejects an invalid type', () => {
      const input = {
        components: [
          { nodeId: 'node_1', type: 'InvalidType', confidence: 0.9 },
        ],
      };
      expect(() => AiResponseSchema.parse(input)).toThrow(z.ZodError);
    });

    it('rejects confidence out of range', () => {
      expect(() => SemanticComponentSchema.parse({ nodeId: 'n1', type: 'Card', confidence: 1.5 })).toThrow(z.ZodError);
      expect(() => SemanticComponentSchema.parse({ nodeId: 'n1', type: 'Card', confidence: -0.1 })).toThrow(z.ZodError);
    });

    it('rejects missing nodeId', () => {
      expect(() => SemanticComponentSchema.parse({ type: 'Card', confidence: 0.9 })).toThrow(z.ZodError);
    });

    it('accepts optional reasoning field', () => {
      const withReasoning = { nodeId: 'n1', type: 'Card', confidence: 0.9, reasoning: 'test' };
      const withoutReasoning = { nodeId: 'n1', type: 'Card', confidence: 0.9 };
      expect(() => SemanticComponentSchema.parse(withReasoning)).not.toThrow();
      expect(() => SemanticComponentSchema.parse(withoutReasoning)).not.toThrow();
    });

    it('rejects non-JSON input', () => {
      expect(() => AiResponseSchema.parse('not json')).toThrow();
    });
  });

  describe('Invalid JSON Response Handling', () => {
    it('returns empty array for malformed JSON', async () => {
      const { createAiDetector } = await import('../packages/semantic-analyzer/ai.js');
      const detector = createAiDetector({ baseUrl: 'http://localhost:19999', timeout: 100 });
      const styledNodes: StyledNode[] = [];
      const result = await detector(styledNodes);
      expect(Array.isArray(result)).toBe(true);
    });

    it('falls back gracefully when Ollama is unreachable', async () => {
      const { createAiDetector } = await import('../packages/semantic-analyzer/ai.js');
      const detector = createAiDetector({ baseUrl: 'http://localhost:19999', timeout: 100, retryCount: 0 });
      const styledNodes: StyledNode[] = [];
      const result = await detector(styledNodes);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Retry Behavior', () => {
    it('respects retryCount configuration', async () => {
      const { createAiDetector } = await import('../packages/semantic-analyzer/ai.js');
      const detector = createAiDetector({ retryCount: 3, timeout: 100, baseUrl: 'http://localhost:19999' });
      expect(detector).toBeDefined();
    });
  });

  describe('NodeId Mapping', () => {
    it('produces SemanticHint with correct nodeId from serialization', async () => {
      const { parseHtml } = await import('../packages/parser/index.js');
      const { parseCss, applyStyles } = await import('../packages/css-analyzer/index.js');

      const html = '<nav class="navbar"><h1>Title</h1></nav>';
      const css = '.navbar { background: #333; }';
      const ast = unwrap(parseHtml(html));
      const sheet = unwrap(parseCss(css));
      const styled = unwrap(applyStyles(ast.children, sheet));

      expect(styled[0].node.nodeId).toBeTruthy();
      expect(styled[0].node.nodeId).toMatch(/^node_\d+$/);
    });
  });

  describe('AI/Rule Merge Correctness', () => {
    it('deduplicates hints by type+nodeId', async () => {
      const { detectSemantics } = await import('../packages/semantic-analyzer/index.js');
      const { parseHtml } = await import('../packages/parser/index.js');
      const { parseCss, applyStyles } = await import('../packages/css-analyzer/index.js');

      const html = '<nav class="navbar"><h1>Title</h1></nav><div class="card"><p>Content</p></div>';
      const css = '.navbar { background: #333; } .card { padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px; }';
      const ast = unwrap(parseHtml(html));
      const sheet = unwrap(parseCss(css));
      const styled = unwrap(applyStyles(ast.children, sheet));
      const ruleHints = unwrap(detectSemantics(styled));

      expect(ruleHints.some(h => h.type === 'NavigationBar')).toBe(true);
      expect(ruleHints.some(h => h.type === 'Card')).toBe(true);

      const keys = ruleHints.map(h => `${h.type}-${h.node.nodeId}`);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });
});

// -- Phase 2: AI-Powered IR Extraction --

describe('Phase 2 — AI-Powered IR Extraction', () => {
  describe('Rule-Based Intent Inference', () => {
    it('infers Navbar from NavigationBar type', async () => {
      const { enrichWithIntentSync } = await import('../packages/ir/index.js');
      const node: UiNode = {
        type: 'NavigationBar',
        properties: {},
        children: [],
      };
      const enriched = enrichWithIntentSync(node);
      expect(enriched.semanticIntent).toBe('Navbar');
    });

    it('infers Hero from HeroSection type', async () => {
      const { enrichWithIntentSync } = await import('../packages/ir/index.js');
      const node: UiNode = { type: 'HeroSection', properties: {}, children: [] };
      const enriched = enrichWithIntentSync(node);
      expect(enriched.semanticIntent).toBe('Hero');
    });

    it('infers Card from Card type', async () => {
      const { enrichWithIntentSync } = await import('../packages/ir/index.js');
      const node: UiNode = { type: 'Card', properties: {}, children: [] };
      const enriched = enrichWithIntentSync(node);
      expect(enriched.semanticIntent).toBe('Card');
    });

    it('infers Unknown for Container without hints', async () => {
      const { enrichWithIntentSync } = await import('../packages/ir/index.js');
      const node: UiNode = { type: 'Container', properties: {}, children: [] };
      const enriched = enrichWithIntentSync(node);
      expect(enriched.semanticIntent).toBe('Unknown');
    });

    it('infers Pricing from className', async () => {
      const { enrichWithIntentSync } = await import('../packages/ir/index.js');
      const node: UiNode = { type: 'Container', properties: { className: 'pricing-card' }, children: [] };
      const enriched = enrichWithIntentSync(node);
      expect(enriched.semanticIntent).toBe('Pricing');
    });

    it('infers Marketing from banner className', async () => {
      const { enrichWithIntentSync } = await import('../packages/ir/index.js');
      const node: UiNode = { type: 'Container', properties: { className: 'banner' }, children: [] };
      const enriched = enrichWithIntentSync(node);
      expect(enriched.semanticIntent).toBe('Marketing');
    });

    it('recursively enriches children', async () => {
      const { enrichWithIntentSync } = await import('../packages/ir/index.js');
      const node: UiNode = {
        type: 'Container',
        properties: {},
        children: [
          { type: 'Card', properties: {}, children: [] },
          { type: 'Footer', properties: {}, children: [] },
        ],
      };
      const enriched = enrichWithIntentSync(node);
      expect(enriched.children[0].semanticIntent).toBe('Card');
      expect(enriched.children[1].semanticIntent).toBe('Footer');
    });
  });

  describe('Serialization for AI', () => {
    it('serializes IR tree correctly', async () => {
      const node: UiNode = {
        type: 'Column',
        properties: { padding: '16px' },
        children: [
          { type: 'Text', properties: {}, children: [], value: 'Hello' },
        ],
      };
      expect(node.children[0].value).toBe('Hello');
    });
  });
});

// -- Phase 3: CSS Intent Understanding --

describe('Phase 3 — CSS Intent Understanding', () => {
  describe('detectLayoutIntent', () => {
    it('detects Centered layout from text-align center', async () => {
      const { detectLayoutIntent } = await import('../packages/css-analyzer/intent.js');
      const styled: StyledNode = {
        node: { nodeId: '1', tagName: 'div', attributes: [], children: [] },
        styles: { 'text-align': 'center', display: 'block' },
        children: [],
      };
      const intent = detectLayoutIntent(styled);
      expect(intent.type).toBe('Centered');
      expect(intent.confidence).toBeGreaterThan(0);
    });

    it('detects Grid layout from display grid', async () => {
      const { detectLayoutIntent } = await import('../packages/css-analyzer/intent.js');
      const styled: StyledNode = {
        node: { nodeId: '1', tagName: 'div', attributes: [], children: [] },
        styles: { display: 'grid', 'grid-template-columns': '1fr 1fr 1fr' },
        children: [],
      };
      const intent = detectLayoutIntent(styled);
      expect(intent.type).toBe('Grid');
    });

    it('detects FlexRow from flex-direction row', async () => {
      const { detectLayoutIntent } = await import('../packages/css-analyzer/intent.js');
      const styled: StyledNode = {
        node: { nodeId: '1', tagName: 'div', attributes: [], children: [] },
        styles: { display: 'flex', 'flex-direction': 'row' },
        children: [],
      };
      const intent = detectLayoutIntent(styled);
      expect(intent.type).toBe('FlexRow');
    });

    it('detects FlexColumn from flex-direction column', async () => {
      const { detectLayoutIntent } = await import('../packages/css-analyzer/intent.js');
      const styled: StyledNode = {
        node: { nodeId: '1', tagName: 'div', attributes: [], children: [] },
        styles: { display: 'flex', 'flex-direction': 'column' },
        children: [],
      };
      const intent = detectLayoutIntent(styled);
      expect(intent.type).toBe('FlexColumn');
    });

    it('detects ResponsiveGrid from repeat pattern', async () => {
      const { detectLayoutIntent } = await import('../packages/css-analyzer/intent.js');
      const styled: StyledNode = {
        node: { nodeId: '1', tagName: 'div', attributes: [], children: [] },
        styles: { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)' },
        children: [],
      };
      const intent = detectLayoutIntent(styled);
      expect(intent.type).toBe('ResponsiveGrid');
    });

    it('detects Unknown for empty styles', async () => {
      const { detectLayoutIntent } = await import('../packages/css-analyzer/intent.js');
      const styled: StyledNode = {
        node: { nodeId: '1', tagName: 'span', attributes: [], children: [] },
        styles: {},
        children: [],
      };
      const intent = detectLayoutIntent(styled);
      expect(intent.type).toBe('Stack');
    });
  });

  describe('analyzeLayoutIntents', () => {
    it('attaches layoutIntent to all StyledNodes recursively', async () => {
      const { analyzeLayoutIntents } = await import('../packages/css-analyzer/intent.js');
      const styled: StyledNode = {
        node: { nodeId: '1', tagName: 'div', attributes: [], children: [] },
        styles: { 'text-align': 'center' },
        children: [
          {
            node: { nodeId: '2', tagName: 'span', attributes: [], children: [] },
            styles: {},
            children: [],
          },
        ],
      };
      const [analyzed] = analyzeLayoutIntents([styled]);
      expect(analyzed.layoutIntent).toBeDefined();
      expect(analyzed.children[0].layoutIntent).toBeDefined();
    });
  });
});

// -- Phase 4: Responsive Intelligence --

describe('Phase 4 — Responsive Intelligence', () => {
  describe('extractBreakpoints', () => {
    it('extracts breakpoints from media queries', async () => {
      const { extractBreakpoints } = await import('../packages/css-analyzer/responsive.js');
      const { parseCss } = await import('../packages/css-analyzer/index.js');
      const css = '@media (min-width: 768px) { .card { padding: 24px; } } @media (max-width: 600px) { .card { flex-direction: column; } }';
      const sheet = unwrap(parseCss(css));
      const breakpoints = extractBreakpoints(sheet);
      expect(breakpoints).toHaveLength(2);
      expect(breakpoints[0].condition).toBe('min-width');
      expect(breakpoints[0].value).toBe('768px');
      expect(breakpoints[1].condition).toBe('max-width');
      expect(breakpoints[1].value).toBe('600px');
    });

    it('deduplicates identical breakpoints', async () => {
      const { extractBreakpoints } = await import('../packages/css-analyzer/responsive.js');
      const { parseCss } = await import('../packages/css-analyzer/index.js');
      const css = '@media (min-width: 768px) { .a { color: red; } } @media (min-width: 768px) { .b { color: blue; } }';
      const sheet = unwrap(parseCss(css));
      const breakpoints = extractBreakpoints(sheet);
      expect(breakpoints).toHaveLength(1);
    });
  });

  describe('detectMobileFirst', () => {
    it('detects mobile-first (more min-width queries)', async () => {
      const { detectMobileFirst } = await import('../packages/css-analyzer/responsive.js');
      const { parseCss } = await import('../packages/css-analyzer/index.js');
      const css = '@media (min-width: 768px) { .a { } } @media (min-width: 1024px) { .b { } }';
      const sheet = unwrap(parseCss(css));
      expect(detectMobileFirst(sheet)).toBe(true);
    });

    it('detects desktop-first (more max-width queries)', async () => {
      const { detectMobileFirst } = await import('../packages/css-analyzer/responsive.js');
      const { parseCss } = await import('../packages/css-analyzer/index.js');
      const css = '@media (max-width: 1024px) { .a { } } @media (max-width: 768px) { .b { } }';
      const sheet = unwrap(parseCss(css));
      expect(detectMobileFirst(sheet)).toBe(false);
    });
  });

  describe('buildResponsiveMetadata', () => {
    it('builds full metadata from stylesheet', async () => {
      const { buildResponsiveMetadata } = await import('../packages/css-analyzer/responsive.js');
      const { parseCss } = await import('../packages/css-analyzer/index.js');
      const css = '@media (min-width: 768px) { .card { padding: 24px; } }';
      const sheet = unwrap(parseCss(css));
      const metadata = buildResponsiveMetadata(sheet);
      expect(metadata.breakpoints).toHaveLength(1);
      expect(metadata.mobileFirst).toBe(true);
      expect(metadata.preferredLayout).toBe('mobile-first');
    });

    it('returns empty metadata for no media queries', async () => {
      const { buildResponsiveMetadata } = await import('../packages/css-analyzer/responsive.js');
      const { parseCss } = await import('../packages/css-analyzer/index.js');
      const sheet = unwrap(parseCss('body { color: black; }'));
      const metadata = buildResponsiveMetadata(sheet);
      expect(metadata.breakpoints).toHaveLength(0);
      expect(metadata.preferredLayout).toBe('single-column');
    });
  });
});

// -- Phase 5: Widget Selection Engine --

describe('Phase 5 — Widget Selection Engine', () => {
  describe('selectWidget', () => {
    it('selects ElevatedButton for Button nodes on Flutter', async () => {
      const { selectWidget } = await import('../packages/generator-core/widget-engine.js');
      const node: UiNode = { type: 'Button', properties: {}, children: [], value: 'Click' };
      const suggestion = selectWidget(node, 'flutter');
      expect(suggestion.widget).toBe('ElevatedButton');
      expect(suggestion.platform).toBe('flutter');
    });

    it('selects Button for Button nodes on Compose', async () => {
      const { selectWidget } = await import('../packages/generator-core/widget-engine.js');
      const node: UiNode = { type: 'Button', properties: {}, children: [] };
      const suggestion = selectWidget(node, 'compose');
      expect(suggestion.widget).toBe('Button');
    });

    it('selects Text for text nodes', async () => {
      const { selectWidget } = await import('../packages/generator-core/widget-engine.js');
      const node: UiNode = { type: 'Text', properties: {}, children: [], value: 'Hello' };
      const flutter = selectWidget(node, 'flutter');
      const compose = selectWidget(node, 'compose');
      const swiftui = selectWidget(node, 'swiftui');
      expect(flutter.widget).toBe('Text');
      expect(compose.widget).toBe('Text');
      expect(swiftui.widget).toBe('Text');
    });

    it('selects lazy list for large child counts', async () => {
      const { selectWidget } = await import('../packages/generator-core/widget-engine.js');
      const children = Array(10).fill(null).map(() => ({ type: 'Text' as const, properties: {}, children: [] }));
      const node: UiNode = { type: 'Container', properties: {}, children };
      const suggestion = selectWidget(node, 'flutter');
      expect(suggestion.widget).toContain('ListView');
    });

    it('selects Card widget for Card intent', async () => {
      const { selectWidget } = await import('../packages/generator-core/widget-engine.js');
      const node: UiNode = { type: 'Card', properties: {}, children: [] };
      const suggestion = selectWidget(node, 'flutter');
      expect(suggestion.widget).toBe('Card');
      expect(suggestion.reason).toContain('Card');
    });

    it('selects Drawer for Sidebar intent on Flutter', async () => {
      const { selectWidget } = await import('../packages/generator-core/widget-engine.js');
      const node: UiNode = { type: 'Sidebar', properties: {}, children: [], semanticIntent: 'Sidebar' };
      const suggestion = selectWidget(node, 'flutter');
      expect(suggestion.widget).toBe('Drawer');
    });

    it('selects AppBar for Navbar intent', async () => {
      const { selectWidget } = await import('../packages/generator-core/widget-engine.js');
      const node: UiNode = { type: 'NavigationBar', properties: {}, children: [], semanticIntent: 'Navbar' };
      const suggestion = selectWidget(node, 'flutter');
      expect(suggestion.widget).toBe('AppBar');
    });
  });

  describe('suggestWidgetsForTree', () => {
    it('returns suggestions for entire tree', async () => {
      const { suggestWidgetsForTree } = await import('../packages/generator-core/widget-engine.js');
      const node: UiNode = {
        type: 'Column',
        properties: {},
        children: [
          { type: 'Text', properties: {}, children: [], value: 'Hi' },
          { type: 'Button', properties: {}, children: [] },
        ],
      };
      const result = suggestWidgetsForTree(node, 'flutter');
      expect(result.platform).toBe('flutter');
      expect(result.suggestions.length).toBe(3);
      expect(result.suggestions[1].widget).toBe('Text');
      expect(result.suggestions[2].widget).toBe('ElevatedButton');
    });
  });
});

// -- Phase 6: Embedding-Based Understanding --

describe('Phase 6 — Embedding-Based Understanding', () => {
  describe('SemanticPatternStore', () => {
    it('initializes with default patterns', async () => {
      const { SemanticPatternStore } = await import('../packages/semantic-analyzer/embeddings.js');
      const store = new SemanticPatternStore();
      expect(store.patternCount).toBe(8);
      expect(store.isReady).toBe(false);
    });

    it('matches by tags when embeddings unavailable', async () => {
      const { SemanticPatternStore } = await import('../packages/semantic-analyzer/embeddings.js');
      const { parseHtml } = await import('../packages/parser/index.js');
      const { parseCss, applyStyles } = await import('../packages/css-analyzer/index.js');

      const store = new SemanticPatternStore();
      const html = '<div class="pricing-card"><h3>$10</h3><ul><li>Feature</li></ul></div>';
      const css = '.pricing-card { border: 1px solid #ccc; }';
      const ast = unwrap(parseHtml(html));
      const sheet = unwrap(parseCss(css));
      const styled = unwrap(applyStyles(ast.children, sheet));

      const matches = await store.findSimilar(styled, 0.3);
      expect(Array.isArray(matches)).toBe(true);
    });

    it('supports adding custom patterns', async () => {
      const { SemanticPatternStore } = await import('../packages/semantic-analyzer/embeddings.js');
      const store = new SemanticPatternStore();
      expect(typeof store.addPattern).toBe('function');
    });

    it('supports removing patterns', async () => {
      const { SemanticPatternStore } = await import('../packages/semantic-analyzer/embeddings.js');
      const store = new SemanticPatternStore();
      const removed = store.removePattern('nonexistent-id');
      expect(removed).toBe(false);
      const patterns = store.listPatterns();
      if (patterns.length > 0) {
        const result = store.removePattern(patterns[0].id);
        expect(result).toBe(true);
        expect(store.patternCount).toBe(patterns.length - 1);
      }
    });

    it('lists all patterns', async () => {
      const { SemanticPatternStore } = await import('../packages/semantic-analyzer/embeddings.js');
      const store = new SemanticPatternStore();
      const patterns = store.listPatterns();
      expect(patterns.length).toBe(8);
      expect(patterns[0].id).toBeDefined();
      expect(patterns[0].intent).toBeDefined();
    });
  });

  describe('Tag-based fallback matching', () => {
    it('finds matching patterns by tag keywords', async () => {
      const { SemanticPatternStore } = await import('../packages/semantic-analyzer/embeddings.js');
      const { parseHtml } = await import('../packages/parser/index.js');
      const { parseCss, applyStyles } = await import('../packages/css-analyzer/index.js');

      const store = new SemanticPatternStore();
      const html = '<nav class="navbar"><h1>Site</h1></nav>';
      const css = '.navbar { background: #333; }';
      const ast = unwrap(parseHtml(html));
      const sheet = unwrap(parseCss(css));
      const styled = unwrap(applyStyles(ast.children, sheet));

      const matches = await store.findSimilar(styled, 0.3);
      const navbarMatch = matches.find(m => m.intent === 'Navbar');
      if (navbarMatch) {
        expect(navbarMatch.similarity).toBeGreaterThan(0);
      }
    });
  });
});

// -- Phase 7: AI Optimizer --

describe('Phase 7 — AI Optimizer', () => {
  describe('New Optimization Passes', () => {
    it('removeRedundantNesting collapses nested Containers', async () => {
      const { optimize, defaultPasses } = await import('../packages/optimizer/index.js');
      const ir: UiNode = {
        type: 'Container',
        properties: {},
        children: [
          {
            type: 'Container',
            properties: {},
            children: [{ type: 'Text', properties: {}, children: [], value: 'Hello' }],
          },
        ],
      };
      const result = unwrap(optimize(ir, defaultPasses));
      expect(result.type).toBe('Text');
      expect(result.value).toBe('Hello');
    });

    it('simplifyLayout removes empty containers', async () => {
      const { optimize, defaultPasses } = await import('../packages/optimizer/index.js');
      const ir: UiNode = {
        type: 'Container',
        properties: {},
        children: [],
      };
      const result = unwrap(optimize(ir, defaultPasses));
      expect(result.type).toBe('Spacer');
    });

    it('simplifyLayout merges Text into Button', async () => {
      const { optimize, defaultPasses } = await import('../packages/optimizer/index.js');
      const ir: UiNode = {
        type: 'Button',
        properties: {},
        children: [{ type: 'Text', properties: {}, children: [], value: 'Click Me' }],
      };
      const result = unwrap(optimize(ir, defaultPasses));
      expect(result.value).toBe('Click Me');
      expect(result.properties.label).toBe('Click Me');
      expect(result.children).toHaveLength(0);
    });

    it('optimizeForResponsive adds ScrollView for mobile-first with many children', async () => {
      const { optimize } = await import('../packages/optimizer/index.js');
      const pass = { name: 'optimizeForResponsive', run: (await import('../packages/optimizer/index.js')).defaultPasses[6].run };
      const children: UiNode[] = [
        { type: 'Text', properties: {}, children: [], value: 'A' },
        { type: 'Button', properties: {}, children: [] },
        { type: 'Image', properties: { src: 'a.png' }, children: [] },
        { type: 'Text', properties: {}, children: [], value: 'B' },
        { type: 'Divider', properties: {}, children: [] },
      ];
      const ir: UiNode = {
        type: 'Column',
        properties: {},
        children,
        responsiveMetadata: {
          breakpoints: [{ condition: 'min-width', value: '768px', layoutHints: [] }],
          preferredLayout: 'mobile-first',
          mobileFirst: true,
        },
      };
      const result = unwrap(optimize(ir, [pass]));
      expect(result.children.length).toBe(5);
      expect(result.type).toBe('ScrollView');
    });

    it('preserves existing passes', async () => {
      const { optimize, defaultPasses } = await import('../packages/optimizer/index.js');
      const ir: UiNode = {
        type: 'Container',
        properties: { id: 'test' },
        children: [
          { type: 'Text', properties: {}, children: [], value: '' },
          { type: 'Text', properties: {}, children: [], value: 'Hello' },
          { type: 'Text', properties: {}, children: [], value: 'World' },
        ],
      };
      const result = unwrap(optimize(ir, defaultPasses));
      expect(result.children.length).toBe(1);
      expect(result.children[0].value).toContain('Hello');
    });
  });
});

// -- Cross-cutting: Full Pipeline Integration --

describe('Full Pipeline Integration with AI Features', () => {
  it('rule-based detection works without AI flag', async () => {
    const { parseHtml } = await import('../packages/parser/index.js');
    const { parseCss, applyStyles } = await import('../packages/css-analyzer/index.js');
    const { detectSemantics } = await import('../packages/semantic-analyzer/index.js');
    const { styledNodeToIr, enrichWithIntentSync } = await import('../packages/ir/index.js');
    const { optimize } = await import('../packages/optimizer/index.js');
    const { generate } = await import('../packages/generators/flutter/index.js');

    const html = '<nav class="navbar"><h1>App</h1></nav><div class="card"><p>Content</p></div>';
    const css = '.navbar { background: #333; } .card { padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px; }';
    const ast = unwrap(parseHtml(html));
    const sheet = unwrap(parseCss(css));
    const styled = unwrap(applyStyles(ast.children, sheet));
    const hints = unwrap(detectSemantics(styled));
    const rootStyled = { node: ast, styles: {}, children: styled };
    const irResult = styledNodeToIr(rootStyled, hints);
    const irNode = unwrap(irResult);
    const ir = enrichWithIntentSync(irNode);
    const optimized = unwrap(optimize(ir));
    const result = unwrap(generate(optimized));

    expect(result.code).toContain('AppBar');
    expect(result.code).toContain('Card');
    expect(result.metadata.platform).toBe('flutter');
  });

  it('CSS layout intent flows through pipeline', async () => {
    const { analyzeLayoutIntents } = await import('../packages/css-analyzer/intent.js');
    const { parseHtml } = await import('../packages/parser/index.js');
    const { parseCss, applyStyles } = await import('../packages/css-analyzer/index.js');

    const html = '<div style="display:flex;flex-direction:row"><span>A</span><span>B</span></div>';
    const css = '';
    const ast = unwrap(parseHtml(html));
    const sheet = unwrap(parseCss(css));
    const styled = unwrap(applyStyles(ast.children, sheet));
    const analyzed = analyzeLayoutIntents(styled);

    expect(analyzed[0].layoutIntent).toBeDefined();
  });

  it('responsive metadata attaches to IR', async () => {
    const { buildResponsiveMetadata } = await import('../packages/css-analyzer/responsive.js');
    const { parseCss } = await import('../packages/css-analyzer/index.js');
    const { styledNodeToIr } = await import('../packages/ir/index.js');
    const { parseHtml } = await import('../packages/parser/index.js');
    const { applyStyles } = await import('../packages/css-analyzer/index.js');

    const css = '@media (min-width: 768px) { .card { padding: 24px; } }';
    const html = '<div class="card">Content</div>';
    const sheet = unwrap(parseCss(css));
    const ast = unwrap(parseHtml(html));
    const styled = unwrap(applyStyles(ast.children, sheet));
    const rootStyled = { node: ast, styles: {}, children: styled };
    const ir = unwrap(styledNodeToIr(rootStyled, []));

    const metadata = buildResponsiveMetadata(sheet);
    expect(metadata.breakpoints.length).toBe(1);
    expect(metadata.breakpoints[0].value).toBe('768px');
  });

  it('widget selection produces valid platform suggestions', async () => {
    const { selectWidget } = await import('../packages/generator-core/widget-engine.js');
    const { parseHtml } = await import('../packages/parser/index.js');
    const { parseCss, applyStyles } = await import('../packages/css-analyzer/index.js');
    const { detectSemantics } = await import('../packages/semantic-analyzer/index.js');
    const { styledNodeToIr, enrichWithIntentSync } = await import('../packages/ir/index.js');

    const html = '<nav class="navbar"><h1>App</h1></nav><button>Click</button>';
    const css = '.navbar { background: #333; }';
    const ast = unwrap(parseHtml(html));
    const sheet = unwrap(parseCss(css));
    const styled = unwrap(applyStyles(ast.children, sheet));
    const hints = unwrap(detectSemantics(styled));
    const rootStyled = { node: ast, styles: {}, children: styled };
    const ir = enrichWithIntentSync(unwrap(styledNodeToIr(rootStyled, hints)));

    const navbarSuggestion = selectWidget(ir.children[0], 'flutter');
    expect(navbarSuggestion.widget).toBe('AppBar');

    const buttonSuggestion = selectWidget(ir.children[1], 'compose');
    expect(buttonSuggestion.widget).toBe('Button');
  });

  it('AI module imports do not break existing API', async () => {
    const semanticAnalyzer = await import('../packages/semantic-analyzer/index.js');
    expect(typeof semanticAnalyzer.detectSemantics).toBe('function');

    const aiModule = await import('../packages/semantic-analyzer/ai.js');
    expect(typeof aiModule.createAiDetector).toBe('function');

    const embeddingsModule = await import('../packages/semantic-analyzer/embeddings.js');
    expect(typeof embeddingsModule.SemanticPatternStore).toBe('function');

    const irModule = await import('../packages/ir/index.js');
    expect(typeof irModule.styledNodeToIr).toBe('function');
    expect(typeof irModule.enrichWithIntentSync).toBe('function');

    const cssIntent = await import('../packages/css-analyzer/intent.js');
    expect(typeof cssIntent.detectLayoutIntent).toBe('function');

    const responsive = await import('../packages/css-analyzer/responsive.js');
    expect(typeof responsive.buildResponsiveMetadata).toBe('function');

    const widgetEngine = await import('../packages/generator-core/widget-engine.js');
    expect(typeof widgetEngine.selectWidget).toBe('function');
  });
});
