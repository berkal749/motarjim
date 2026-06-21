import type {
  Alignment,
  Background,
  BoxLayout,
  ChildLayout,
  CrossAxisAlignment,
  FlexDirection,
  FlexLayout,
  Gap,
  LayoutConstraints,
  LayoutNode,
  MainAxisAlignment,
  Positioned,
  RelativeConstraintHint,
  ScrollLayout,
  Spacing,
  StackLayout,
} from '@html-native/shared';
import { defaultChildLayout } from '@html-native/shared';

export interface CssComputedLayoutStyle {
  display?: string;
  position?: string;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  flexDirection?: string;
  flexWrap?: string;
  justifyContent?: string;
  alignItems?: string;
  alignSelf?: string;
  gap?: string | number;
  rowGap?: string | number;
  columnGap?: string | number;
  flexGrow?: string | number;
  flexShrink?: string | number;
  flexBasis?: string | number;
  flex?: string;
  order?: string | number;
  width?: string | number;
  height?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  padding?: string;
  paddingTop?: string | number;
  paddingRight?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  margin?: string;
  marginTop?: string | number;
  marginRight?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  background?: string;
  backgroundColor?: string;
}

export interface SemanticLayoutInput {
  id: string;
  elementType: string;
  computedStyle: CssComputedLayoutStyle;
  children: readonly SemanticLayoutInput[];
}

export interface LayoutBridgeResult {
  node: LayoutNode;
  relativeConstraints: readonly RelativeConstraintHint[];
}

interface DimensionResult {
  constraints: Partial<Omit<LayoutConstraints, 'intrinsicSize'>>;
  intrinsicSize: LayoutConstraints['intrinsicSize'];
  relativeHints: RelativeConstraintHint[];
}

export function cssToLayoutNode(input: SemanticLayoutInput): LayoutBridgeResult {
  const childResults = input.children.map(cssToLayoutNode);
  const style = input.computedStyle;
  const node: LayoutNode = {
    id: input.id,
    layout: inferContainerLayout(style),
    child: resolveChildLayout(style),
    children: childResults.map((child) => child.node),
  };

  return {
    node,
    relativeConstraints: [
      ...collectRelativeConstraints(style),
      ...childResults.flatMap((child) => child.relativeConstraints),
    ],
  };
}

export function cssToFlexLayout(style: CssComputedLayoutStyle): FlexLayout {
  return {
    kind: 'flex',
    direction: mapFlexDirection(style.flexDirection),
    mainAxisAlignment: mapMainAxisAlignment(style.justifyContent),
    crossAxisAlignment: mapCrossAxisAlignment(style.alignItems),
    gap: parseGap(style.gap ?? style.columnGap ?? style.rowGap),
    wrap: style.flexWrap === 'wrap' || style.flexWrap === 'wrap-reverse',
    reversed: style.flexDirection === 'row-reverse' || style.flexDirection === 'column-reverse',
  };
}

export function cssToBoxLayout(style: CssComputedLayoutStyle): BoxLayout {
  const padding = parseSpacing(style, 'padding');
  const margin = parseSpacing(style, 'margin');
  const background = parseBackground(style);
  return {
    kind: 'box',
    ...(padding ? { padding } : {}),
    ...(margin ? { margin } : {}),
    ...(background ? { background } : {}),
  };
}

export function cssToStackLayout(style: CssComputedLayoutStyle): StackLayout {
  return {
    kind: 'stack',
    alignment: positionHasTopOrLeftBias(style) ? 'top-left' : 'center',
    fit: 'passthrough',
    clip: style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflowY === 'hidden',
  };
}

export function cssToScrollLayout(style: CssComputedLayoutStyle): ScrollLayout {
  return {
    kind: 'scroll',
    axis: style.overflowX === 'auto' || style.overflowX === 'scroll' ? 'horizontal' : 'vertical',
    showIndicator: true,
    pagingEnabled: false,
    snap: false,
  };
}

export function resolveChildLayout(style: CssComputedLayoutStyle): ChildLayout {
  const basis = parseFlexBasis(style.flexBasis);
  const position = parsePositioned(style);
  return {
    ...defaultChildLayout(),
    flexGrow: parseNumber(style.flexGrow) ?? parseFlexShorthand(style.flex).grow ?? 0,
    flexShrink: parseNumber(style.flexShrink) ?? parseFlexShorthand(style.flex).shrink ?? 1,
    flexBasis: basis ?? parseFlexShorthand(style.flex).basis ?? 'auto',
    alignSelf: mapAlignSelf(style.alignSelf),
    order: parseNumber(style.order) ?? 0,
    constraints: cssToConstraints(style),
    ...(position ? { position } : {}),
    ...optionalSpacing('margin', parseSpacing(style, 'margin')),
    ...optionalSpacing('padding', parseSpacing(style, 'padding')),
  };
}

function inferContainerLayout(style: CssComputedLayoutStyle): FlexLayout | StackLayout | ScrollLayout | BoxLayout {
  if (style.position === 'absolute' || style.position === 'fixed') return cssToStackLayout(style);
  if (isScrollable(style)) return cssToScrollLayout(style);
  if (style.display === 'flex' || style.display === 'inline-flex') return cssToFlexLayout(style);
  return cssToBoxLayout(style);
}

function cssToConstraints(style: CssComputedLayoutStyle): LayoutConstraints {
  const width = parseDimension('width', style.width);
  const height = parseDimension('height', style.height);
  const minWidth = parseDimension('width', style.minWidth, 'min');
  const maxWidth = parseDimension('width', style.maxWidth, 'max');
  const minHeight = parseDimension('height', style.minHeight, 'min');
  const maxHeight = parseDimension('height', style.maxHeight, 'max');

  return {
    ...width.constraints,
    ...height.constraints,
    ...minWidth.constraints,
    ...maxWidth.constraints,
    ...minHeight.constraints,
    ...maxHeight.constraints,
    intrinsicSize: chooseIntrinsicSize(width, height),
    relative: [
      ...width.relativeHints,
      ...height.relativeHints,
      ...minWidth.relativeHints,
      ...maxWidth.relativeHints,
      ...minHeight.relativeHints,
      ...maxHeight.relativeHints,
    ],
  };
}

function collectRelativeConstraints(style: CssComputedLayoutStyle): RelativeConstraintHint[] {
  return [
    ...parseDimension('width', style.width).relativeHints,
    ...parseDimension('height', style.height).relativeHints,
    ...parseDimension('width', style.minWidth, 'min').relativeHints,
    ...parseDimension('width', style.maxWidth, 'max').relativeHints,
    ...parseDimension('height', style.minHeight, 'min').relativeHints,
    ...parseDimension('height', style.maxHeight, 'max').relativeHints,
  ];
}

function parseDimension(axis: 'width' | 'height', value: string | number | undefined, edge: RelativeConstraintHint['edge'] = 'size'): DimensionResult {
  if (value === undefined) return { constraints: {}, intrinsicSize: { kind: 'min-content' }, relativeHints: [] };
  if (typeof value === 'number') return fixedDimension(axis, value, edge);
  const trimmed = value.trim();
  if (trimmed === 'auto') return { constraints: {}, intrinsicSize: { kind: 'auto' }, relativeHints: [] };
  if (trimmed === 'min-content' || trimmed === 'max-content' || trimmed === 'fit-content') return { constraints: {}, intrinsicSize: { kind: trimmed }, relativeHints: [] };
  const px = parsePx(trimmed);
  if (px !== undefined) return fixedDimension(axis, px, edge);
  const percent = parsePercent(trimmed);
  if (percent !== undefined) return { constraints: {}, intrinsicSize: { kind: 'fit-content' }, relativeHints: [{ axis, edge, percent }] };
  return { constraints: {}, intrinsicSize: { kind: 'min-content' }, relativeHints: [] };
}

function fixedDimension(axis: 'width' | 'height', value: number, edge: RelativeConstraintHint['edge']): DimensionResult {
  const constraints: Partial<Omit<LayoutConstraints, 'intrinsicSize'>> = {};
  if (axis === 'width' && edge === 'size') Object.assign(constraints, { minWidth: value, maxWidth: value });
  if (axis === 'height' && edge === 'size') Object.assign(constraints, { minHeight: value, maxHeight: value });
  if (axis === 'width' && edge === 'min') Object.assign(constraints, { minWidth: value });
  if (axis === 'width' && edge === 'max') Object.assign(constraints, { maxWidth: value });
  if (axis === 'height' && edge === 'min') Object.assign(constraints, { minHeight: value });
  if (axis === 'height' && edge === 'max') Object.assign(constraints, { maxHeight: value });
  return { constraints, intrinsicSize: { kind: 'fixed', value }, relativeHints: [] };
}

function chooseIntrinsicSize(width: DimensionResult, height: DimensionResult): LayoutConstraints['intrinsicSize'] {
  if (width.intrinsicSize.kind === 'fixed') return width.intrinsicSize;
  if (height.intrinsicSize.kind === 'fixed') return height.intrinsicSize;
  if (width.intrinsicSize.kind === 'auto' || height.intrinsicSize.kind === 'auto') return { kind: 'auto' };
  if (width.intrinsicSize.kind === 'fit-content' || height.intrinsicSize.kind === 'fit-content') return { kind: 'fit-content' };
  return { kind: 'min-content' };
}

function mapFlexDirection(value: string | undefined): FlexDirection {
  return value === 'column' || value === 'column-reverse' ? 'column' : 'row';
}

function mapMainAxisAlignment(value: string | undefined): MainAxisAlignment {
  switch (value) {
    case 'center': return 'center';
    case 'flex-end':
    case 'end': return 'end';
    case 'space-between': return 'space-between';
    case 'space-around': return 'space-around';
    case 'space-evenly': return 'space-evenly';
    default: return 'start';
  }
}

function mapCrossAxisAlignment(value: string | undefined): CrossAxisAlignment {
  switch (value) {
    case 'center': return 'center';
    case 'flex-end':
    case 'end': return 'end';
    case 'stretch': return 'stretch';
    case 'baseline': return 'baseline';
    default: return 'start';
  }
}

function mapAlignSelf(value: string | undefined): Alignment {
  return value === 'auto' || value === undefined ? 'stretch' : mapCrossAxisAlignment(value);
}

function parseSpacing(style: CssComputedLayoutStyle, prefix: 'padding' | 'margin'): Spacing | undefined {
  const shorthand = style[prefix];
  const box = typeof shorthand === 'string' ? parseSpacingShorthand(shorthand) : undefined;
  const top = parseCssNumber(style[`${prefix}Top`]) ?? box?.top;
  const right = parseCssNumber(style[`${prefix}Right`]) ?? box?.right;
  const bottom = parseCssNumber(style[`${prefix}Bottom`]) ?? box?.bottom;
  const left = parseCssNumber(style[`${prefix}Left`]) ?? box?.left;
  if (top === undefined && right === undefined && bottom === undefined && left === undefined) return undefined;
  return { top: top ?? 0, right: right ?? 0, bottom: bottom ?? 0, left: left ?? 0 };
}

function parseSpacingShorthand(value: string): Spacing | undefined {
  const parts = value.trim().split(/\s+/).map(parseCssNumber);
  if (parts.some((part) => part === undefined)) return undefined;
  const nums = parts as number[];
  if (nums.length === 1) return { top: nums[0], right: nums[0], bottom: nums[0], left: nums[0] };
  if (nums.length === 2) return { top: nums[0], right: nums[1], bottom: nums[0], left: nums[1] };
  if (nums.length === 3) return { top: nums[0], right: nums[1], bottom: nums[2], left: nums[1] };
  if (nums.length === 4) return { top: nums[0], right: nums[1], bottom: nums[2], left: nums[3] };
  return undefined;
}

function parseBackground(style: CssComputedLayoutStyle): Background | undefined {
  if (style.backgroundColor) return { color: style.backgroundColor };
  if (style.background) return { token: style.background };
  return undefined;
}

function parseGap(value: string | number | undefined): Gap {
  return parseCssNumber(value) ?? 'none';
}

function parsePositioned(style: CssComputedLayoutStyle): Positioned | undefined {
  if (style.position !== 'absolute' && style.position !== 'fixed') return undefined;
  const positioned: Positioned = {};
  const top = parseCssNumber(style.top);
  const right = parseCssNumber(style.right);
  const bottom = parseCssNumber(style.bottom);
  const left = parseCssNumber(style.left);
  const width = parseCssNumber(style.width);
  const height = parseCssNumber(style.height);
  if (top !== undefined) positioned.top = top;
  if (right !== undefined) positioned.right = right;
  if (bottom !== undefined) positioned.bottom = bottom;
  if (left !== undefined) positioned.left = left;
  if (width !== undefined) positioned.width = width;
  if (height !== undefined) positioned.height = height;
  return positioned;
}

function parseFlexBasis(value: string | number | undefined): number | 'auto' | undefined {
  if (value === undefined) return undefined;
  if (value === 'auto') return 'auto';
  return parseCssNumber(value);
}

function parseFlexShorthand(value: string | undefined): { grow?: number; shrink?: number; basis?: number | 'auto' } {
  if (!value) return {};
  if (value === 'none') return { grow: 0, shrink: 0, basis: 'auto' };
  if (value === 'auto') return { grow: 1, shrink: 1, basis: 'auto' };
  const parts = value.trim().split(/\s+/);
  const grow = parseNumber(parts[0]);
  const shrink = parseNumber(parts[1]);
  const basis = parseFlexBasis(parts[2]);
  return { ...(grow !== undefined ? { grow } : {}), ...(shrink !== undefined ? { shrink } : {}), ...(basis !== undefined ? { basis } : {}) };
}

function isScrollable(style: CssComputedLayoutStyle): boolean {
  return style.overflow === 'auto' || style.overflow === 'scroll' || style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'scroll';
}

function positionHasTopOrLeftBias(style: CssComputedLayoutStyle): boolean {
  return style.top !== undefined || style.left !== undefined;
}

function optionalSpacing(key: 'margin' | 'padding', value: Spacing | undefined): { margin?: Spacing; padding?: Spacing } {
  return value ? { [key]: value } : {};
}

function parseCssNumber(value: string | number | undefined): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;
  return parsePx(value.trim());
}

function parseNumber(value: string | number | undefined): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parsePx(value: string): number | undefined {
  const px = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (px) return Number(px[1]);
  const bare = value.match(/^(-?\d+(?:\.\d+)?)$/);
  return bare ? Number(bare[1]) : undefined;
}

function parsePercent(value: string): number | undefined {
  const percent = value.match(/^(-?\d+(?:\.\d+)?)%$/);
  return percent ? Number(percent[1]) / 100 : undefined;
}
