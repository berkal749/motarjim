// ============================================================
// IR v2 — Three-Layer Intermediate Representation
// ============================================================
//
// Layers:
//   1. Semantic IR — what the element IS  (button, text, form…)
//   2. Layout IR   — how children are arranged  (flex, grid…)
//   3. Target IR   — platform-specific codegen hints
//
// Design principles:
//   - Fully typed TypeScript, no `Record<string, unknown>`
//   - Discriminated unions for exhaustive matching
//   - Every node carries identity, source location, a11y metadata,
//     typed computed styles, and responsive variants
// ============================================================

// ============================================================
// 0.  Shared Primitives
// ============================================================

export interface SourceSpan {
  file: string;
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface BreakpointCondition {
  condition: 'min-width' | 'max-width' | 'min-height' | 'max-height';
  value: string;
}

// ============================================================
// 1.  Core IR Node
// ============================================================

export interface IrNode {
  id: string;
  sourceSpan: SourceSpan;
  accessibility: AccessibilityMetadata;
  computedStyle: ComputedStyle;
  responsiveVariants: ResponsiveVariant[];
  semantics: SemanticIR;
  layout: LayoutIR;
  target: TargetIR;
  children: IrNode[];
}

// ============================================================
// 2.  Accessibility Metadata
// ============================================================

export interface AccessibilityMetadata {
  label?: string;
  hint?: string;
  role?: string;
  hidden: boolean;
  focusable: boolean;
  liveRegion?: 'off' | 'polite' | 'assertive';
}

// ============================================================
// 3.  Typed ComputedStyle (replaces old `ResolvedStyles` bag)
// ============================================================

export type TextAlign = 'left' | 'right' | 'center' | 'justify';
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';
export type CssDimension = string;
export type PositionType = 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
export type Overflow = 'visible' | 'hidden' | 'scroll' | 'auto';
export type DisplayType = 'block' | 'inline' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' | 'none' | 'contents';

export interface ComputedStyle {
  // Typography
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: string;
  lineHeight?: number;
  textAlign?: TextAlign;
  textDecoration?: string;
  textTransform?: TextTransform;
  color?: string;
  letterSpacing?: number;

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
  boxSizing?: 'content-box' | 'border-box';
  opacity?: number;

  // Color / Background
  backgroundColor?: string;
  backgroundImage?: string;

  // Sizing
  width?: CssDimension;
  height?: CssDimension;
  minWidth?: CssDimension;
  maxWidth?: CssDimension;
  minHeight?: CssDimension;
  maxHeight?: CssDimension;

  // Positioning
  position?: PositionType;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;

  // Overflow
  overflowX?: Overflow;
  overflowY?: Overflow;

  // Visibility
  display?: DisplayType;
  visibility?: 'visible' | 'hidden' | 'collapse';

  // Flex
  flexDirection?: string;
  flexWrap?: string;
  justifyContent?: string;
  alignItems?: string;
  alignContent?: string;
  gap?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
  order?: number;

  // Grid
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;

  // Misc
  transform?: string;
  transition?: string;
  boxShadow?: string;
  cursor?: string;
}

// ============================================================
// 4.  Responsive Variants
// ============================================================

export interface ResponsiveVariant {
  breakpoint: BreakpointCondition;
  layoutOverrides: Partial<LayoutIR>;
  styleOverrides: Partial<ComputedStyle>;
}

// ============================================================
// 5.  Semantic IR  —  what the element IS
// ============================================================

export type SemanticIR =
  | ButtonSemantics
  | TextSemantics
  | HeadingSemantics
  | ImageSemantics
  | IconSemantics
  | FormSemantics
  | InputSemantics
  | TextareaSemantics
  | SelectSemantics
  | LinkSemantics
  | ListSemantics
  | ListItemSemantics
  | TableSemantics
  | DividerSemantics
  | SectionSemantics
  | NavSemantics
  | HeaderSemantics
  | FooterSemantics
  | ArticleSemantics
  | CardSemantics
  | DialogSemantics
  | TabContainerSemantics
  | GenericSemantics
  | UnknownSemantics;

// -- Button --

export type ButtonVariant = 'filled' | 'outlined' | 'text' | 'icon';

export interface ButtonSemantics {
  role: 'button';
  label: string;
  variant: ButtonVariant;
  disabled: boolean;
  loading: boolean;
  icon?: string;
  pressed: boolean;
}

// -- Text --

export type TextType = 'body' | 'caption' | 'label' | 'paragraph' | 'span';

export interface TextSemantics {
  role: 'text';
  content: string;
  textType: TextType;
  maxLines?: number;
  overflow?: 'clip' | 'ellipsis' | 'fade';
}

// -- Heading --

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingSemantics {
  role: 'heading';
  content: string;
  level: HeadingLevel;
}

// -- Image --

export type ImageFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
export type ImageLoading = 'eager' | 'lazy';

export interface ImageSemantics {
  role: 'image';
  source: string;
  alt: string;
  fit: ImageFit;
  loading: ImageLoading;
  aspectRatio?: number;
}

// -- Icon --

export interface IconSemantics {
  role: 'icon';
  name: string;
  size: number;
  color?: string;
}

// -- Form --

export interface FormField {
  name: string;
  type: InputType;
  label: string;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
}

export interface FormSemantics {
  role: 'form';
  action?: string;
  method?: 'get' | 'post' | 'dialog';
  name?: string;
  autoComplete: boolean;
  fields: FormField[];
}

// -- Input --

export type InputType =
  | 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search'
  | 'date' | 'time' | 'datetime-local' | 'month' | 'week'
  | 'color' | 'file' | 'range'
  | 'checkbox' | 'radio';

export interface ValidationRules {
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  step?: number;
  custom?: string;
}

export interface InputSemantics {
  role: 'input';
  inputType: InputType;
  name?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  validation?: ValidationRules;
}

// -- Textarea --

export interface TextareaSemantics {
  role: 'textarea';
  name?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  rows: number;
  cols: number;
  maxLength?: number;
  minLength?: number;
  validation?: ValidationRules;
}

// -- Select --

export interface SelectOption {
  label: string;
  value: string;
  disabled: boolean;
  selected: boolean;
}

export interface SelectSemantics {
  role: 'select';
  name?: string;
  multiple: boolean;
  required: boolean;
  disabled: boolean;
  options: SelectOption[];
  value?: string[];
}

// -- Link --

export interface LinkSemantics {
  role: 'link';
  href: string;
  target?: '_self' | '_blank' | '_parent' | '_top';
  rel?: string;
  download?: string;
  label: string;
}

// -- List --

export type ListStyle =
  | 'none' | 'disc' | 'circle' | 'square'
  | 'decimal' | 'lower-alpha' | 'upper-alpha'
  | 'lower-roman' | 'upper-roman';

export interface ListItemSemantics {
  role: 'list-item';
  label: string;
  value?: number;
}

export interface ListSemantics {
  role: 'list';
  ordered: boolean;
  items: ListItemSemantics[];
  listStyle: ListStyle;
  start?: number;
  reversed: boolean;
}

// -- Table --

export interface TableColumn {
  header: string;
  scope?: 'col' | 'row';
  sortable: boolean;
}

export interface TableCell {
  content: string;
  colSpan: number;
  rowSpan: number;
  header: boolean;
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableSemantics {
  role: 'table';
  caption?: string;
  columns: TableColumn[];
  rows: TableRow[];
  summary?: string;
}

// -- Divider --

export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerSemantics {
  role: 'divider';
  orientation: DividerOrientation;
  thickness?: number;
}

// -- Landmark / structural --

export interface SectionSemantics {
  role: 'section';
  label?: string;
}

export interface NavSemantics {
  role: 'nav';
  label?: string;
}

export interface HeaderSemantics {
  role: 'header';
  label?: string;
}

export interface FooterSemantics {
  role: 'footer';
  label?: string;
}

export interface ArticleSemantics {
  role: 'article';
  label?: string;
}

// -- Card --

export interface CardSemantics {
  role: 'card';
  elevation?: number;
}

// -- Dialog --

export interface DialogSemantics {
  role: 'dialog';
  modal: boolean;
  dismissable: boolean;
}

// -- Tabs --

export interface TabItem {
  label: string;
  icon?: string;
  disabled: boolean;
}

export interface TabContainerSemantics {
  role: 'tab-container';
  tabs: TabItem[];
  activeIndex: number;
}

// -- Fallback --

export interface GenericSemantics {
  role: 'generic';
}

export interface UnknownSemantics {
  role: 'unknown';
  originalTag?: string;
}

// ============================================================
// 6.  Layout IR  —  how children are arranged
// ============================================================

export type LayoutIR =
  | NoLayout
  | BoxLayout
  | FlexLayout
  | GridLayout
  | StackLayout
  | ScrollLayout
  | AbsoluteLayout;

// -- No layout (leaf semantic node never arranges children) --

export interface NoLayout {
  strategy: 'none';
}

// -- Box (plain container) --

export type BoxSizingMode = 'fit-content' | 'fill' | 'fixed';

export interface BoxLayout {
  strategy: 'box';
  sizing: BoxSizingMode;
}

// -- Flex (CSS flexbox / Flutter Row/Column) --

export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type MainAxisAlignment = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
export type CrossAxisAlignment = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

export interface FlexLayout {
  strategy: 'flex';
  direction: FlexDirection;
  wrap: FlexWrap;
  justifyContent: MainAxisAlignment;
  alignItems: CrossAxisAlignment;
  alignContent: CrossAxisAlignment;
  gap: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
}

// -- Grid (CSS Grid / Flutter GridView) --

export interface GridTrack {
  size: string;
  name?: string;
}

export interface GridGap {
  row: number;
  column: number;
}

export type GridAutoFlow = 'row' | 'column' | 'row-dense' | 'column-dense';

export interface GridLayout {
  strategy: 'grid';
  columns: GridTrack[];
  rows: GridTrack[];
  gap: GridGap;
  autoFlow: GridAutoFlow;
  autoRows?: GridTrack;
  autoColumns?: GridTrack;
}

// -- Stack (overlapping / CSS absolute parent) --

export type StackHorizontalAlignment = 'start' | 'center' | 'end' | 'stretch';
export type StackVerticalAlignment = 'start' | 'center' | 'end' | 'stretch';
export type StackFit = 'loose' | 'expand' | 'passthrough';

export interface StackLayout {
  strategy: 'stack';
  alignment: {
    horizontal: StackHorizontalAlignment;
    vertical: StackVerticalAlignment;
  };
  fit: StackFit;
}

// -- Scroll --

export type ScrollAxis = 'horizontal' | 'vertical' | 'both';

export interface ScrollLayout {
  strategy: 'scroll';
  axis: ScrollAxis;
  showScrollbar: boolean;
  scrollBehavior: 'auto' | 'smooth';
  pagingEnabled: boolean;
  snapAlignment?: 'start' | 'center' | 'end';
}

// -- Absolute (positioned child) --

export interface AbsoluteLayout {
  strategy: 'absolute';
  position: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  zIndex: number;
}

// ============================================================
// 7.  Target IR  —  platform-specific codegen hints
// ============================================================

export interface TargetIR {
  flutter?: FlutterHint;
  compose?: ComposeHint;
  swiftui?: SwiftUIHint;
}

// -- Flutter --

export interface FlutterHint {
  preferredWidget: string;
  widgetKind: 'material' | 'cupertino' | 'custom';
  importStatement?: string;
  constructorArgs?: NamedArgument[];
  wrappedIn?: string[];
}

// -- Compose --

export interface ComposeHint {
  preferredComposable: string;
  importStatement?: string;
  modifierChain?: string[];
}

// -- SwiftUI --

export interface SwiftUIHint {
  preferredView: string;
  importStatement?: string;
  modifierChain?: string[];
}

// -- Shared for target hints --

export interface NamedArgument {
  name: string;
  value: string;
}

// ============================================================
// 8.  Convenience constructors
// ============================================================

export const defaultAccessibility = (overrides?: Partial<AccessibilityMetadata>): AccessibilityMetadata => ({
  hidden: false,
  focusable: false,
  ...overrides,
});

export const emptySourceSpan = (file = ''): SourceSpan => ({
  file,
  start: { line: 0, column: 0 },
  end: { line: 0, column: 0 },
});

export const defaultComputedStyle = (): ComputedStyle => ({});

export const defaultTargetIR = (): TargetIR => ({});

// ============================================================
// 9.  Type guards
// ============================================================

export function isSemanticRole<T extends SemanticIR['role']>(
  sem: SemanticIR,
  role: T,
): sem is Extract<SemanticIR, { role: T }> {
  return sem.role === role;
}

export function hasLayout(
  layout: LayoutIR,
  ...strategies: LayoutIR['strategy'][]
): boolean {
  return strategies.includes(layout.strategy);
}
