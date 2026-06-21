// -- Diagnostics System --

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type DiagnosticPhase = 'parser' | 'css' | 'semantic' | 'accessibility' | 'ir' | 'optimizer' | 'generator';

export interface SourceSpan {
  file: string;
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface Diagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  phase: DiagnosticPhase;
  sourceSpan?: SourceSpan;
}

export type Result<T> =
  | { ok: true; value: T; diagnostics: Diagnostic[] }
  | { ok: false; diagnostics: Diagnostic[] };

export interface DiagnosticBag {
  diagnostics: Diagnostic[];
  add(diagnostic: Diagnostic): void;
  addError(code: string, message: string, phase: DiagnosticPhase, sourceSpan?: SourceSpan): void;
  addWarning(code: string, message: string, phase: DiagnosticPhase, sourceSpan?: SourceSpan): void;
  addInfo(code: string, message: string, phase: DiagnosticPhase, sourceSpan?: SourceSpan): void;
  hasErrors(): boolean;
  toResult<T>(value: T): Result<T>;
  asResult(): Result<never>;
}

// -- HTML AST Types --

export interface HtmlAttribute {
  name: string;
  value: string;
}

export interface HtmlNode {
  nodeId: string;
  tagName: string;
  attributes: HtmlAttribute[];
  children: HtmlNode[];
  value?: string;
  sourceSpan?: SourceSpan;
}

// -- Selector AST --

export type Combinator = 'descendant' | 'child' | 'adjacent-sibling' | 'general-sibling';

export interface SelectorSimple {
  type: 'universal' | 'tag' | 'class' | 'id' | 'attribute' | 'pseudo';
  value: string;
  operator?: string;
  compareValue?: string;
}

export interface SelectorCompound {
  simples: SelectorSimple[];
}

export interface SelectorRelation {
  left: SelectorAst;
  combinator: Combinator;
  right: SelectorCompound;
}

export type SelectorAst = SelectorCompound | SelectorRelation;

export interface Specificity {
  id: number;
  class: number;
  tag: number;
}

export function specificityCompare(a: Specificity, b: Specificity): number {
  if (a.id !== b.id) return b.id - a.id;
  if (a.class !== b.class) return b.class - a.class;
  return b.tag - a.tag;
}

// -- CSS Types --

export interface CssStyleDeclaration {
  property: string;
  value: string;
  important: boolean;
}

export interface CssRule {
  selectors: string[];
  declarations: CssStyleDeclaration[];
  sourceSpan?: SourceSpan;
}

export interface CssMediaQuery {
  condition: string;
  rules: CssRule[];
}

export interface CssStylesheet {
  rules: CssRule[];
  mediaQueries: CssMediaQuery[];
}

// -- Resolved Styles (HTML node -> computed styles) --

export interface ResolvedStyles {
  [property: string]: string;
}

// -- Computed Style (typed, normalized style representation) --

export interface ComputedStyle {
  // Box model
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  boxSizing?: string;

  // Flexbox
  display?: string;
  flexDirection?: string;
  flexWrap?: string;
  justifyContent?: string;
  alignItems?: string;
  alignContent?: string;
  gap?: number;
  flex?: string;

  // Typography
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: string;
  lineHeight?: number;
  textAlign?: string;
  textDecoration?: string;
  textTransform?: string;
  color?: string;
  letterSpacing?: number;

  // Color / Background
  backgroundColor?: string;
  background?: string;
  opacity?: number;

  // Sizing
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  position?: string;
}

export interface StyledNode {
  node: HtmlNode;
  styles: ResolvedStyles;
  children: StyledNode[];
  layoutIntent?: LayoutIntent;
}

// -- IR Types --

export type UiNodeType =
  | 'Container'
  | 'Row'
  | 'Column'
  | 'Stack'
  | 'ScrollView'
  | 'LazyList'
  | 'ListView'
  | 'Grid'
  | 'Text'
  | 'Image'
  | 'Icon'
  | 'Button'
  | 'TextField'
  | 'TextArea'
  | 'Form'
  | 'List'
  | 'NavigationBar'
  | 'AppBar'
  | 'Drawer'
  | 'Card'
  | 'HeroSection'
  | 'Footer'
  | 'Sidebar'
  | 'Dialog'
  | 'Modal'
  | 'Tabs'
  | 'Spacer'
  | 'Divider'
  | 'UnorderedList'
  | 'OrderedList'
  | 'ListItem'
  | 'Section'
  | 'Article'
  | 'Header'
  | 'Nav'
  | 'Link'
  | 'Svg'
  | 'Unknown';

export interface UiNode {
  type: UiNodeType;
  properties: Record<string, unknown>;
  children: UiNode[];
  styles?: ResolvedStyles;
  computed?: ComputedStyle;
  sourceHtmlTag?: string;
  sourceSpan?: SourceSpan;
  originalNodeId?: string;
  value?: string;
  semanticIntent?: SemanticIntent;
  responsiveMetadata?: ResponsiveMetadata;
  accessibility?: AccessibilityInfo;
}

// -- Platform target --

export type PlatformTarget = 'flutter' | 'compose' | 'swiftui';

// -- Generator result --

export interface GenerateResult {
  code: string;
  metadata: {
    platform: PlatformTarget;
    nodes: number;
    duration: number;
  };
}

// -- Semantic detection hints --

export interface SemanticHint {
  type: UiNodeType;
  confidence: number;
  node: HtmlNode;
  reason: string;
}

// -- Semantic Normalization types --

export interface SemanticSignal {
  type: 'tag' | 'class' | 'style' | 'structure' | 'text' | 'attribute' | 'position' | 'childCount';
  name: string;
  value: string | number | boolean;
  weight: number;
}

export interface SemanticRule {
  id: string;
  componentType: UiNodeType;
  description: string;
  signals: SemanticRuleSignal[];
  minScore: number;
  priority: number;
}

export interface SemanticRuleSignal {
  type: SemanticSignal['type'];
  name: string;
  value?: string | number | boolean;
  valueMatch?: 'exact' | 'includes' | 'regex' | 'gt' | 'lt' | 'exists' | 'not';
  weight: number;
}

export interface NormalizedHint {
  type: UiNodeType;
  confidence: number;
  totalScore: number;
  signals: SemanticSignal[];
  node: HtmlNode;
  reason: string;
}

export interface ComponentCandidate {
  name: string;
  type: UiNodeType;
  patternSignature: string;
  occurrences: number;
  nodeIds: string[];
  confidence: number;
  props: Record<string, unknown>;
}

export interface NormalizationResult {
  hints: NormalizedHint[];
  candidates: ComponentCandidate[];
}

// -- Responsive hints for media queries --

export interface ResponsiveHint {
  breakpoint: string;
  condition: 'min-width' | 'max-width' | 'min-height' | 'max-height';
  value: string;
  styles: ResolvedStyles;
}

// -- Accessibility types --

export interface AccessibilityInfo {
  role?: string;
  label?: string;
  hint?: string;
  focusOrder?: number;
  hidden: boolean;
}

export interface AccessibilityIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  nodeId: string;
  tagName: string;
  sourceSpan?: SourceSpan;
}

export interface AccessibilityTree {
  issues: AccessibilityIssue[];
  tree: AccessibilityNode[];
}

export interface AccessibilityNode {
  nodeId: string;
  role: string;
  label?: string;
  hint?: string;
  focusOrder?: number;
  children: AccessibilityNode[];
  issues: AccessibilityIssue[];
}

// -- AI-specific types --

export type SemanticIntent =
  | 'Hero'
  | 'Card'
  | 'Pricing'
  | 'Sidebar'
  | 'Dashboard'
  | 'Navbar'
  | 'Footer'
  | 'Header'
  | 'Dialog'
  | 'Form'
  | 'List'
  | 'Grid'
  | 'Marketing'
  | 'ProductCard'
  | 'Unknown';

export type LayoutIntentType =
  | 'Centered'
  | 'Grid'
  | 'Stack'
  | 'SidebarLayout'
  | 'HeroLayout'
  | 'ResponsiveGrid'
  | 'FlexRow'
  | 'FlexColumn'
  | 'Unknown';

export interface LayoutIntent {
  type: LayoutIntentType;
  properties: Record<string, string>;
  confidence: number;
}

export interface Breakpoint {
  condition: 'min-width' | 'max-width' | 'min-height' | 'max-height';
  value: string;
  layoutHints: LayoutIntent[];
}

export interface ResponsiveMetadata {
  breakpoints: Breakpoint[];
  preferredLayout: string;
  mobileFirst: boolean;
}

export interface WidgetSuggestion {
  platform: PlatformTarget;
  widget: string;
  reason: string;
  properties?: Record<string, unknown>;
}

export interface AiDetectorConfig {
  model?: string;
  baseUrl?: string;
  timeout?: number;
  retryCount?: number;
  batchSize?: number;
  enableEmbeddings?: boolean;
  embeddingModel?: string;
}





// -- Layout System (Motarjim IR v2) --
export * from './alignment.js';
export * from './layout-constraints.js';
export * from './layout-types.js';
export * from './layout-engine.js';
export * from './layout-mapping.js';
export * from './layout-example.js';
