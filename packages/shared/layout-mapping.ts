import type { Alignment2D, CrossAxisAlignment, MainAxisAlignment } from './alignment.js';
import type { NormalizedLayoutConstraints } from './layout-constraints.js';
import type { Axis, ChildLayout, Gap, Positioned } from './layout-types.js';
import { resolveGap, type ResolvedLayoutNode } from './layout-engine.js';

export type PlatformKind = 'flutter' | 'compose' | 'swiftui';

export interface LayoutPlatformMapping {
  containerName(node: ResolvedLayoutNode): string;
  mainAxisAlignment(value: MainAxisAlignment): string;
  crossAxisAlignment(value: CrossAxisAlignment): string;
  alignment2D(value: Alignment2D): string;
  gapValue(gap: Gap): string;
  constraintsSnippet(constraints: NormalizedLayoutConstraints): string;
  wrapChild(child: string, attrs: ChildLayout): string;
  scrollAxisCode(axis: Axis): string;
}

const main = {
  flutter: { start: 'MainAxisAlignment.start', center: 'MainAxisAlignment.center', end: 'MainAxisAlignment.end', 'space-between': 'MainAxisAlignment.spaceBetween', 'space-around': 'MainAxisAlignment.spaceAround', 'space-evenly': 'MainAxisAlignment.spaceEvenly' },
  compose: { start: 'Arrangement.Start', center: 'Arrangement.Center', end: 'Arrangement.End', 'space-between': 'Arrangement.SpaceBetween', 'space-around': 'Arrangement.SpaceAround', 'space-evenly': 'Arrangement.SpaceEvenly' },
  swiftui: { start: '.leading', center: '.center', end: '.trailing', 'space-between': '.spaceBetween', 'space-around': '.spaceAround', 'space-evenly': '.spaceEvenly' },
} satisfies Record<PlatformKind, Record<MainAxisAlignment, string>>;

const cross = {
  flutter: { start: 'CrossAxisAlignment.start', center: 'CrossAxisAlignment.center', end: 'CrossAxisAlignment.end', stretch: 'CrossAxisAlignment.stretch', baseline: 'CrossAxisAlignment.baseline' },
  compose: { start: 'Alignment.Start', center: 'Alignment.CenterHorizontally', end: 'Alignment.End', stretch: 'Alignment.Fill', baseline: 'Alignment.CenterHorizontally' },
  swiftui: { start: '.top', center: '.center', end: '.bottom', stretch: '.center', baseline: '.firstTextBaseline' },
} satisfies Record<PlatformKind, Record<CrossAxisAlignment, string>>;

export const flutterLayoutMapping = createMapping('flutter');
export const composeLayoutMapping = createMapping('compose');
export const swiftuiLayoutMapping = createMapping('swiftui');

export function getLayoutMapping(platform: PlatformKind): LayoutPlatformMapping {
  return platform === 'flutter' ? flutterLayoutMapping : platform === 'compose' ? composeLayoutMapping : swiftuiLayoutMapping;
}

function createMapping(platform: PlatformKind): LayoutPlatformMapping {
  return {
    containerName(node) {
      switch (node.layout.kind) {
        case 'flex': return platform === 'flutter' ? (node.layout.direction === 'row' ? 'Row' : 'Column') : platform === 'compose' ? (node.layout.direction === 'row' ? 'Row' : 'Column') : (node.layout.direction === 'row' ? 'HStack' : 'VStack');
        case 'stack': return platform === 'compose' ? 'Box' : platform === 'flutter' ? 'Stack' : 'ZStack';
        case 'scroll': return platform === 'flutter' ? 'SingleChildScrollView' : platform === 'compose' ? 'ScrollContainer' : 'ScrollView';
        case 'box': return platform === 'flutter' ? 'Container' : platform === 'compose' ? 'Box' : 'Group';
      }
    },
    mainAxisAlignment: (value) => main[platform][value],
    crossAxisAlignment: (value) => cross[platform][value],
    alignment2D: (value) => alignmentMap(platform, value),
    gapValue: (gap) => unit(platform, resolveGap(gap, { responsiveTokens: new Map() })),
    constraintsSnippet: (constraints) => constraintsMap(platform, constraints),
    wrapChild: (child, attrs) => wrapChildMap(platform, child, attrs),
    scrollAxisCode: (axis) => platform === 'flutter' ? `Axis.${axis}` : platform === 'compose' ? (axis === 'vertical' ? 'verticalScroll' : 'horizontalScroll') : `.${axis}`,
  };
}

function alignmentMap(platform: PlatformKind, value: Alignment2D): string {
  const maps = {
    flutter: { center: 'Alignment.center', 'top-left': 'Alignment.topLeft', 'top-center': 'Alignment.topCenter', 'top-right': 'Alignment.topRight', 'center-left': 'Alignment.centerLeft', 'center-right': 'Alignment.centerRight', 'bottom-left': 'Alignment.bottomLeft', 'bottom-center': 'Alignment.bottomCenter', 'bottom-right': 'Alignment.bottomRight' },
    compose: { center: 'Alignment.Center', 'top-left': 'Alignment.TopStart', 'top-center': 'Alignment.TopCenter', 'top-right': 'Alignment.TopEnd', 'center-left': 'Alignment.CenterStart', 'center-right': 'Alignment.CenterEnd', 'bottom-left': 'Alignment.BottomStart', 'bottom-center': 'Alignment.BottomCenter', 'bottom-right': 'Alignment.BottomEnd' },
    swiftui: { center: '.center', 'top-left': '.topLeading', 'top-center': '.top', 'top-right': '.topTrailing', 'center-left': '.leading', 'center-right': '.trailing', 'bottom-left': '.bottomLeading', 'bottom-center': '.bottom', 'bottom-right': '.bottomTrailing' },
  } satisfies Record<PlatformKind, Record<Alignment2D, string>>;
  return maps[platform][value];
}

function constraintsMap(platform: PlatformKind, c: NormalizedLayoutConstraints): string {
  const maxW = Number.isFinite(c.maxWidth) ? c.maxWidth : undefined;
  const maxH = Number.isFinite(c.maxHeight) ? c.maxHeight : undefined;
  return `${platform}:minW=${c.minWidth};maxW=${maxW ?? 'inf'};minH=${c.minHeight};maxH=${maxH ?? 'inf'};intrinsic=${c.intrinsicSize.kind}`;
}

function unit(platform: PlatformKind, value: number): string {
  return platform === 'compose' ? `${value}.dp` : String(value);
}

function wrapChildMap(platform: PlatformKind, child: string, attrs: ChildLayout): string {
  const prefix = attrs.position ? positionedPrefix(platform, attrs.position) : '';
  return `${prefix}${child}`;
}

function positionedPrefix(platform: PlatformKind, position: Positioned): string {
  const left = position.left ?? 0;
  const top = position.top ?? 0;
  return platform === 'flutter' ? `Positioned(left: ${left}, top: ${top}, child: ` : platform === 'compose' ? `Box(Modifier.offset(${left}.dp, ${top}.dp)) { ` : `.position(x: ${left}, y: ${top}) `;
}

export function platformHints(node: ResolvedLayoutNode, platform: PlatformKind): readonly string[] {
  const mapping = getLayoutMapping(platform);
  return [mapping.containerName(node), mapping.constraintsSnippet(node.child.constraints)];
}
