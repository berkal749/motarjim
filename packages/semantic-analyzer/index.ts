import {
  HtmlNode,
  StyledNode,
  ResolvedStyles,
  SemanticSignal,
  SemanticRule,
  SemanticRuleSignal,
  NormalizedHint,
  ComponentCandidate,
  NormalizationResult,
  UiNodeType,
  Result,
} from '@html-native/shared';
import { DiagnosticBag } from '@html-native/shared/diagnostics.js';

export {
  SemanticPatternStore,
  getGlobalPatternStore,
  resetGlobalPatternStore,
} from './embeddings.js';
export type { UiPattern, PatternMatch } from './embeddings.js';

export type SemanticDetector = (nodes: StyledNode[]) => Promise<NormalizedHint[]>;

// ============================================================
// 1. Signal Collection
// ============================================================

function collectSignals(node: StyledNode): SemanticSignal[] {
  const signals: SemanticSignal[] = [];
  const tag = node.node.tagName;
  const classes = getClasses(node.node);
  const styles = node.styles;

  // Tag signal
  if (tag) {
    signals.push({ type: 'tag', name: tag, value: tag, weight: 1.0 });
  }

  // Class signals
  for (const cls of classes) {
    signals.push({ type: 'class', name: cls, value: cls, weight: 0.8 });
  }

  // Style signals
  const styleRules: [string, string, number][] = [
    ['display', 'flex', 0.6],
    ['display', 'grid', 0.6],
    ['position', 'fixed', 0.5],
    ['position', 'sticky', 0.5],
    ['box-shadow', '*', 0.4],
    ['border-radius', '*', 0.3],
  ];
  for (const [prop, val, weight] of styleRules) {
    if (val === '*' ? prop in styles : styles[prop] === val) {
      signals.push({ type: 'style', name: prop, value: styles[prop] || val, weight });
    }
  }

  // Attribute signals
  const attrSignals: [string, string, number][] = [
    ['src', 'img', 0.7],
    ['href', 'a', 0.7],
    ['type', 'input', 0.6],
    ['alt', 'img', 0.5],
    ['role', '*', 0.6],
    ['aria-*', '*', 0.4],
  ];
  for (const [attrName, tagFilter, weight] of attrSignals) {
    if (tagFilter !== '*' && tag !== tagFilter) continue;
    if (attrName.endsWith('*')) {
      const prefix = attrName.slice(0, -1);
      if (node.node.attributes.some(a => a.name.startsWith(prefix))) {
        signals.push({ type: 'attribute', name: attrName, value: true, weight });
      }
    } else {
      const attr = node.node.attributes.find(a => a.name === attrName);
      if (attr) {
        signals.push({ type: 'attribute', name: attrName, value: attr.value, weight });
      }
    }
  }

  // Structure signals (children analysis)
  const childTags = node.children.map(c => c.node.tagName);
  const textChildren = childTags.filter(t => t === '#text' || t === 'p' || t === 'span').length;
  const buttonChildren = childTags.filter(t => t === 'button' || t === 'a').length;
  const inputChildren = childTags.filter(t => t === 'input' || t === 'textarea' || t === 'select').length;
  const headingChildren = childTags.filter(t => /^h[1-6]$/.test(t)).length;
  const listChildren = childTags.filter(t => t === 'ul' || t === 'ol' || t === 'li').length;
  const imgChildren = childTags.filter(t => t === 'img').length;

  if (textChildren > 0)
    signals.push({ type: 'structure', name: 'hasText', value: textChildren, weight: 0.3 });
  if (buttonChildren > 0)
    signals.push({ type: 'structure', name: 'hasButton', value: buttonChildren, weight: 0.5 });
  if (inputChildren > 0)
    signals.push({ type: 'structure', name: 'hasInputs', value: inputChildren, weight: 0.6 });
  if (headingChildren > 0)
    signals.push({ type: 'structure', name: 'hasHeading', value: headingChildren, weight: 0.4 });
  if (listChildren > 0)
    signals.push({ type: 'structure', name: 'hasList', value: listChildren, weight: 0.5 });
  if (imgChildren > 0)
    signals.push({ type: 'structure', name: 'hasImage', value: imgChildren, weight: 0.4 });

  // Child count signals
  const totalChildren = node.children.length;
  if (totalChildren >= 3)
    signals.push({ type: 'childCount', name: 'manyChildren', value: totalChildren, weight: 0.3 });
  if (totalChildren === 0)
    signals.push({ type: 'childCount', name: 'leaf', value: 0, weight: 0.1 });

  // Position signals (approximate from classes)
  if (classes.some(c => c.includes('top') || c.includes('header')))
    signals.push({ type: 'position', name: 'top', value: 'top', weight: 0.4 });
  if (classes.some(c => c.includes('bottom') || c.includes('footer')))
    signals.push({ type: 'position', name: 'bottom', value: 'bottom', weight: 0.4 });
  if (classes.some(c => c.includes('side') || c.includes('left') || c.includes('right')))
    signals.push({ type: 'position', name: 'side', value: 'side', weight: 0.4 });

  return signals;
}

function getClasses(node: HtmlNode): string[] {
  const classAttr = node.attributes.find(a => a.name === 'class');
  return classAttr ? classAttr.value.split(/\s+/) : [];
}

// ============================================================
// 2. Semantic Rules
// ============================================================

function ruleSignal(name: string, value?: string | number | boolean, weight: number = 1.0): SemanticRuleSignal {
  return { type: 'class', name, value, weight };
}

const RULES: SemanticRule[] = [
  // -- Card --
  {
    id: 'card-class',
    componentType: 'Card',
    description: 'Element with card class',
    priority: 10,
    minScore: 0.7,
    signals: [
      { type: 'class', name: 'card', weight: 1.0 },
      { type: 'class', name: 'card-body', weight: 0.9 },
      { type: 'class', name: 'card-content', weight: 0.9 },
    ],
  },
  {
    id: 'card-styles',
    componentType: 'Card',
    description: 'Container with shadow and rounded corners',
    priority: 5,
    minScore: 0.6,
    signals: [
      { type: 'style', name: 'box-shadow', weight: 0.5 },
      { type: 'style', name: 'border-radius', weight: 0.4 },
      { type: 'structure', name: 'hasHeading', weight: 0.3 },
      { type: 'structure', name: 'hasText', weight: 0.2 },
    ],
  },
  {
    id: 'card-structured',
    componentType: 'Card',
    description: 'Container with heading, text, and optional button/image',
    priority: 4,
    minScore: 0.5,
    signals: [
      { type: 'tag', name: 'div', weight: 0.2 },
      { type: 'structure', name: 'hasHeading', weight: 0.5 },
      { type: 'structure', name: 'hasText', weight: 0.3 },
      { type: 'childCount', name: 'manyChildren', weight: 0.2 },
    ],
  },

  // -- Navbar --
  {
    id: 'navbar-tag',
    componentType: 'NavigationBar',
    description: 'nav element',
    priority: 10,
    minScore: 0.8,
    signals: [
      { type: 'tag', name: 'nav', weight: 1.0 },
    ],
  },
  {
    id: 'navbar-class',
    componentType: 'NavigationBar',
    description: 'Element with navbar/nav/navigation class',
    priority: 8,
    minScore: 0.7,
    signals: [
      { type: 'class', name: 'navbar', weight: 1.0 },
      { type: 'class', name: 'nav', weight: 0.8 },
      { type: 'class', name: 'navigation', weight: 0.9 },
      { type: 'class', name: 'nav-bar', weight: 0.9 },
    ],
  },
  {
    id: 'navbar-structure',
    componentType: 'NavigationBar',
    description: 'Top-level container with links and heading',
    priority: 5,
    minScore: 0.4,
    signals: [
      { type: 'position', name: 'top', weight: 0.3 },
      { type: 'structure', name: 'hasList', weight: 0.3 },
      { type: 'structure', name: 'hasText', weight: 0.2 },
    ],
  },

  // -- Form --
  {
    id: 'form-tag',
    componentType: 'Form',
    description: 'form element',
    priority: 10,
    minScore: 0.8,
    signals: [
      { type: 'tag', name: 'form', weight: 1.0 },
    ],
  },
  {
    id: 'form-class',
    componentType: 'Form',
    description: 'Element with form class and input children',
    priority: 7,
    minScore: 0.6,
    signals: [
      { type: 'class', name: 'form', weight: 0.6 },
      { type: 'class', name: 'contact-form', weight: 0.7 },
      { type: 'class', name: 'login-form', weight: 0.7 },
      { type: 'class', name: 'search-form', weight: 0.7 },
      { type: 'structure', name: 'hasInputs', weight: 0.5 },
    ],
  },
  {
    id: 'form-structure',
    componentType: 'Form',
    description: 'Container with multiple inputs and a button',
    priority: 4,
    minScore: 0.5,
    signals: [
      { type: 'structure', name: 'hasInputs', weight: 0.6 },
      { type: 'structure', name: 'hasButton', weight: 0.4 },
    ],
  },

  // -- Hero Section --
  {
    id: 'hero-class',
    componentType: 'HeroSection',
    description: 'Element with hero class',
    priority: 10,
    minScore: 0.7,
    signals: [
      { type: 'class', name: 'hero', weight: 1.0 },
      { type: 'class', name: 'hero-section', weight: 1.0 },
      { type: 'class', name: 'banner', weight: 0.8 },
      { type: 'class', name: 'hero-banner', weight: 0.9 },
    ],
  },
  {
    id: 'hero-structure',
    componentType: 'HeroSection',
    description: 'Large centered section with heading, text, and CTA button',
    priority: 6,
    minScore: 0.5,
    signals: [
      { type: 'structure', name: 'hasHeading', weight: 0.5 },
      { type: 'structure', name: 'hasText', weight: 0.3 },
      { type: 'structure', name: 'hasButton', weight: 0.4 },
      { type: 'childCount', name: 'manyChildren', weight: 0.2 },
    ],
  },

  // -- List --
  {
    id: 'list-tag',
    componentType: 'UnorderedList',
    description: 'ul or ol element',
    priority: 10,
    minScore: 0.8,
    signals: [
      { type: 'tag', name: 'ul', weight: 1.0 },
    ],
  },
  {
    id: 'list-ol-tag',
    componentType: 'OrderedList',
    description: 'ol element',
    priority: 10,
    minScore: 0.8,
    signals: [
      { type: 'tag', name: 'ol', weight: 1.0 },
    ],
  },
  {
    id: 'list-class',
    componentType: 'List',
    description: 'Element with list/item class and li children',
    priority: 6,
    minScore: 0.5,
    signals: [
      { type: 'class', name: 'list', weight: 0.6 },
      { type: 'structure', name: 'hasList', weight: 0.5 },
    ],
  },
  {
    id: 'list-item-tag',
    componentType: 'ListItem',
    description: 'li element',
    priority: 10,
    minScore: 0.8,
    signals: [
      { type: 'tag', name: 'li', weight: 1.0 },
    ],
  },

  // -- Footer --
  {
    id: 'footer-tag',
    componentType: 'Footer',
    description: 'footer element',
    priority: 10,
    minScore: 0.8,
    signals: [
      { type: 'tag', name: 'footer', weight: 1.0 },
    ],
  },
  {
    id: 'footer-class',
    componentType: 'Footer',
    description: 'Element with footer class',
    priority: 8,
    minScore: 0.7,
    signals: [
      { type: 'class', name: 'footer', weight: 1.0 },
    ],
  },

  // -- Header --
  {
    id: 'header-tag',
    componentType: 'Header',
    description: 'header element',
    priority: 10,
    minScore: 0.8,
    signals: [
      { type: 'tag', name: 'header', weight: 1.0 },
    ],
  },

  // -- Section --
  {
    id: 'section-tag',
    componentType: 'Section',
    description: 'section element',
    priority: 8,
    minScore: 0.7,
    signals: [
      { type: 'tag', name: 'section', weight: 0.8 },
    ],
  },

  // -- Article --
  {
    id: 'article-tag',
    componentType: 'Article',
    description: 'article element',
    priority: 8,
    minScore: 0.7,
    signals: [
      { type: 'tag', name: 'article', weight: 0.8 },
    ],
  },

  // -- Nav --
  {
    id: 'nav-tag',
    componentType: 'Nav',
    description: 'nav element (secondary)',
    priority: 7,
    minScore: 0.7,
    signals: [
      { type: 'tag', name: 'nav', weight: 0.9 },
    ],
  },

  // -- Sidebar --
  {
    id: 'sidebar-class',
    componentType: 'Sidebar',
    description: 'Element with sidebar class',
    priority: 9,
    minScore: 0.7,
    signals: [
      { type: 'class', name: 'sidebar', weight: 1.0 },
      { type: 'class', name: 'side-bar', weight: 1.0 },
      { type: 'class', name: 'drawer', weight: 0.9 },
    ],
  },
  {
    id: 'sidebar-structure',
    componentType: 'Sidebar',
    description: 'Aside with navigation links',
    priority: 5,
    minScore: 0.4,
    signals: [
      { type: 'position', name: 'side', weight: 0.3 },
      { type: 'structure', name: 'hasList', weight: 0.3 },
    ],
  },

  // -- Dialog/Modal --
  {
    id: 'dialog-class',
    componentType: 'Dialog',
    description: 'Element with dialog/modal class',
    priority: 8,
    minScore: 0.7,
    signals: [
      { type: 'class', name: 'modal', weight: 1.0 },
      { type: 'class', name: 'dialog', weight: 1.0 },
      { type: 'class', name: 'overlay', weight: 0.8 },
    ],
  },

  // -- Tabs --
  {
    id: 'tabs-class',
    componentType: 'Tabs',
    description: 'Element with tabs class',
    priority: 8,
    minScore: 0.7,
    signals: [
      { type: 'class', name: 'tabs', weight: 1.0 },
      { type: 'class', name: 'tab-bar', weight: 0.9 },
      { type: 'class', name: 'tab-container', weight: 0.9 },
    ],
  },
];

// ============================================================
// 3. Score Computation
// ============================================================

function matchRuleSignal(signal: SemanticSignal, ruleSig: SemanticRuleSignal): boolean {
  if (signal.type !== ruleSig.type) return false;
  if (ruleSig.name !== signal.name && ruleSig.name !== '*') return false;

  const mode = ruleSig.valueMatch || 'exact';
  const val = ruleSig.value;

  // If no value constraint, match by type+name alone
  if (val === undefined) return true;

  switch (mode) {
    case 'exact':
      return signal.value === val;
    case 'includes':
      return String(signal.value).includes(String(val));
    case 'regex':
      return new RegExp(String(val)).test(String(signal.value));
    case 'gt':
      return typeof signal.value === 'number' && typeof val === 'number' && signal.value > val;
    case 'lt':
      return typeof signal.value === 'number' && typeof val === 'number' && signal.value < val;
    case 'exists':
      return true;
    case 'not':
      return signal.value !== val;
    default:
      return signal.value === val;
  }
}

function computeRuleScore(rule: SemanticRule, signals: SemanticSignal[]): { score: number; matched: SemanticSignal[] } {
  const matched: SemanticSignal[] = [];

  for (const ruleSig of rule.signals) {
    // Try to find a matching signal
    const signal = signals.find(s => matchRuleSignal(s, ruleSig));
    if (signal) {
      matched.push(signal);
    }
  }

  if (matched.length === 0) return { score: 0, matched: [] };

  // Weighted sum of matched signals, normalized by total possible weight
  const totalWeight = rule.signals.reduce((sum, s) => sum + s.weight, 0);
  const matchedWeight = matched.reduce((sum, s) => {
    const ruleSig = rule.signals.find(rs => rs.name === s.name && rs.type === s.type);
    return sum + (ruleSig?.weight || s.weight);
  }, 0);

  const coverageScore = matched.length / rule.signals.length;
  const weightedScore = totalWeight > 0 ? matchedWeight / totalWeight : 0;

  // Final score: weighted combination of coverage and weight
  const score = coverageScore * 0.3 + weightedScore * 0.7;

  return { score, matched };
}

// ============================================================
// 4. Repeated Structure Detection
// ============================================================

function computePatternSignature(node: StyledNode): string {
  const tag = node.node.tagName;
  const classes = getClasses(node.node).sort().join('.');
  const childTags = node.children.map(c => c.node.tagName).sort().join(',');
  return `${tag}.${classes}[${childTags}]`;
}

function detectComponentCandidates(nodes: StyledNode[]): ComponentCandidate[] {
  // Walk tree and group nodes by structural pattern signature
  const patternGroups = new Map<string, { nodes: StyledNode[]; type: UiNodeType }>();

  function walk(node: StyledNode): void {
    const sig = computePatternSignature(node);
    const existing = patternGroups.get(sig);

    // Detect likely type from structure
    let type: UiNodeType = inferTypeFromPattern(node);

    if (existing) {
      existing.nodes.push(node);
    } else {
      patternGroups.set(sig, { nodes: [node], type });
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  for (const node of nodes) {
    walk(node);
  }

  const candidates: ComponentCandidate[] = [];

  for (const [signature, group] of patternGroups) {
    if (group.nodes.length < 2) continue; // Need at least 2 occurrences

    const first = group.nodes[0];
    const classes = getClasses(first.node);
    const name = classes.find(c => !['container', 'wrapper', 'item'].includes(c))
      || group.type.toLowerCase()
      || `component`;

    const props = extractSharedProps(group.nodes);

    candidates.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      type: group.type,
      patternSignature: signature,
      occurrences: group.nodes.length,
      nodeIds: group.nodes.map(n => n.node.nodeId),
      confidence: Math.min(0.5 + group.nodes.length * 0.1, 0.95),
      props,
    });
  }

  return candidates;
}

function inferTypeFromPattern(node: StyledNode): UiNodeType {
  const tag = node.node.tagName;
  const classes = getClasses(node.node);
  const childTags = new Set(node.children.map(c => c.node.tagName));

  if (classes.includes('card') || classes.includes('card-body')) return 'Card';
  if (tag === 'li' || classes.includes('list-item')) return 'ListItem';
  if (tag === 'button') return 'Button';
  if (childTags.has('img') && childTags.has('button')) return 'Card';
  if (childTags.has('h2') || childTags.has('h3')) return 'Card';
  if (tag === 'input' || tag === 'textarea') return 'TextField';
  if (tag === 'img') return 'Image';

  return 'Container';
}

function extractSharedProps(nodes: StyledNode[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Check if all nodes share the same classes
  const allClasses = nodes.map(n => getClasses(n.node).sort().join(' '));
  if (allClasses.every(c => c === allClasses[0]) && allClasses[0]) {
    props.className = allClasses[0];
  }

  // Check for consistent child count
  const childCounts = nodes.map(n => n.children.length);
  if (childCounts.every(c => c === childCounts[0])) {
    props.childCount = childCounts[0];
  }

  return props;
}

// ============================================================
// 5. Normalization
// ============================================================

function normalizeHints(
  styledNodes: StyledNode[],
  allSignals: Map<string, SemanticSignal[]>,
): NormalizedHint[] {
  const hints: NormalizedHint[] = [];
  const assignedNodes = new Set<string>();

  // Sort rules by priority (higher first)
  const sortedRules = [...RULES].sort((a, b) => b.priority - a.priority);

  // Apply rules to each node
  for (const node of styledNodes) {
    walkAndScore(node, sortedRules, allSignals, hints, assignedNodes);
  }

  // Deduplicate: keep highest confidence per node per type
  return deduplicateHints(hints);
}

function walkAndScore(
  node: StyledNode,
  rules: SemanticRule[],
  allSignals: Map<string, SemanticSignal[]>,
  hints: NormalizedHint[],
  assignedNodes: Set<string>,
): void {
  const signals = allSignals.get(node.node.nodeId) || [];

  for (const rule of rules) {
    const { score, matched } = computeRuleScore(rule, signals);
    if (score >= rule.minScore) {
      // Boost confidence if tag directly matches
      const tagBoost = signals.some(s => s.type === 'tag' && s.name === node.node.tagName) ? 0.1 : 0;
      const confidence = Math.min(score + tagBoost, 1.0);

      hints.push({
        type: rule.componentType,
        confidence,
        totalScore: score,
        signals: matched,
        node: node.node,
        reason: rule.description,
      });
    }
  }

  // Recurse into children
  for (const child of node.children) {
    walkAndScore(child, rules, allSignals, hints, assignedNodes);
  }
}

function deduplicateHints(hints: NormalizedHint[]): NormalizedHint[] {
  const seen = new Map<string, NormalizedHint>();

  for (const hint of hints) {
    const key = `${hint.node.nodeId}:${hint.type}`;
    const existing = seen.get(key);
    if (!existing || hint.confidence > existing.confidence) {
      seen.set(key, hint);
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
}

// ============================================================
// 6. Backward-Compatible SemanticHint Adapter
// ============================================================

function toLegacyHints(normalized: NormalizedHint[]): import('@html-native/shared').SemanticHint[] {
  return normalized.map(h => ({
    type: h.type,
    confidence: h.confidence,
    node: h.node,
    reason: h.reason,
  }));
}

// ============================================================
// 7. Public API
// ============================================================

export function normalizeSemantics(styledNodes: StyledNode[]): Result<NormalizationResult> {
  const bag = new DiagnosticBag();

  // Phase 1: Collect signals
  const allSignals = new Map<string, SemanticSignal[]>();
  function collectAllSignals(nodes: StyledNode[]): void {
    for (const node of nodes) {
      allSignals.set(node.node.nodeId, collectSignals(node));
      collectAllSignals(node.children);
    }
  }
  collectAllSignals(styledNodes);

  if (allSignals.size === 0) {
    bag.addWarning('SEM_001', 'No semantic signals collected — tree may be empty', 'semantic');
    return bag.toResult({ hints: [], candidates: [] });
  }

  // Phase 2: Apply rules and normalize
  const hints = normalizeHints(styledNodes, allSignals);

  // Phase 3: Detect component candidates (repeated structures)
  const candidates = detectComponentCandidates(styledNodes);

  if (hints.length === 0) {
    bag.addInfo('SEM_002', 'No semantic components detected', 'semantic');
  }

  return bag.toResult({ hints, candidates });
}

// -- Legacy API (backward compatible) --

export function detectSemantics(
  styledNodes: StyledNode[],
): Result<import('@html-native/shared').SemanticHint[]> {
  const result = normalizeSemantics(styledNodes);
  if (!result.ok) {
    return { ok: false, diagnostics: result.diagnostics };
  }
  return {
    ok: true,
    value: toLegacyHints(result.value.hints),
    diagnostics: result.diagnostics,
  };
}

// -- Formatting for debugging --

export function formatNormalizationResult(result: NormalizationResult): string {
  const lines: string[] = [];

  lines.push('Semantic Hints:');
  for (const hint of result.hints) {
    const tag = hint.node.tagName || '(root)';
    const id = hint.node.nodeId;
    const sigs = hint.signals.map(s => `${s.type}:${s.name}`).join(', ');
    lines.push(`  [${(hint.confidence * 100).toFixed(0)}%] ${hint.type} <${tag}> #${id}`);
    lines.push(`       reason: ${hint.reason}`);
    lines.push(`       signals: ${sigs}`);
  }

  if (result.candidates.length > 0) {
    lines.push('\nComponent Candidates (repeated structures):');
    for (const c of result.candidates) {
      lines.push(`  [${(c.confidence * 100).toFixed(0)}%] ${c.name} (${c.type}) ×${c.occurrences}`);
      lines.push(`       pattern: ${c.patternSignature}`);
      lines.push(`       nodes: ${c.nodeIds.join(', ')}`);
    }
  }

  return lines.join('\n');
}
