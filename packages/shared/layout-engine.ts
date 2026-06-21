import { alignment2DVector, type Alignment2D, type CrossAxisAlignment, type MainAxisAlignment } from './alignment.js';
import { normalizeConstraints, type NormalizedLayoutConstraints } from './layout-constraints.js';
import type { BoxLayout, ChildLayout, FlexLayout, Gap, LayoutNode, ScrollLayout, StackLayout } from './layout-types.js';

export interface ResolvedChildLayout extends Omit<ChildLayout, 'constraints'> {
  constraints: NormalizedLayoutConstraints;
}

export type ResolvedContainerLayout =
  | (FlexLayout & { resolvedGap: number; resolvedMainAxisAlignment: MainAxisAlignment; resolvedCrossAxisAlignment: CrossAxisAlignment })
  | (StackLayout & { resolvedAlignment: Alignment2D; alignmentVector: ReturnType<typeof alignment2DVector> })
  | (ScrollLayout & { normalizedConstraints: NormalizedLayoutConstraints })
  | (BoxLayout & { normalizedConstraints: NormalizedLayoutConstraints });

export interface ResolvedLayoutNode {
  id: string;
  layout: ResolvedContainerLayout;
  child: ResolvedChildLayout;
  children: ResolvedLayoutNode[];
}

export interface LayoutResolutionContext {
  responsiveTokens: ReadonlyMap<string, number>;
  viewportWidth?: number;
  viewportHeight?: number;
}

export function resolveLayoutTree(node: LayoutNode, context: LayoutResolutionContext = { responsiveTokens: new Map() }): ResolvedLayoutNode {
  const child = resolveChildLayout(node.child);
  const children = node.children
    .map((candidate) => resolveLayoutTree(candidate, context))
    .sort((a, b) => a.child.order - b.child.order || a.id.localeCompare(b.id));

  switch (node.layout.kind) {
    case 'flex': return { id: node.id, child, layout: resolveFlexLayout(node.layout, context), children };
    case 'stack': return { id: node.id, child, layout: resolveStackLayout(node.layout), children };
    case 'scroll': return { id: node.id, child, layout: resolveScrollLayout(node.layout, child.constraints), children };
    case 'box': return { id: node.id, child, layout: resolveBoxLayout(node.layout, child.constraints), children };
  }
}

export function resolveFlexLayout(layout: FlexLayout, context: LayoutResolutionContext = { responsiveTokens: new Map() }): ResolvedContainerLayout {
  return { ...layout, resolvedGap: resolveGap(layout.gap, context), resolvedMainAxisAlignment: layout.mainAxisAlignment, resolvedCrossAxisAlignment: layout.crossAxisAlignment };
}

export function resolveStackLayout(layout: StackLayout): ResolvedContainerLayout {
  return { ...layout, resolvedAlignment: layout.alignment, alignmentVector: alignment2DVector(layout.alignment) };
}

export function resolveScrollLayout(layout: ScrollLayout, constraints = normalizeConstraints({ intrinsicSize: { kind: 'min-content' } })): ResolvedContainerLayout {
  return { ...layout, normalizedConstraints: constraints };
}

export function resolveBoxLayout(layout: BoxLayout, constraints = normalizeConstraints({ intrinsicSize: { kind: 'min-content' } })): ResolvedContainerLayout {
  return { ...layout, normalizedConstraints: constraints };
}

export function resolveChildLayout(child: ChildLayout): ResolvedChildLayout {
  if (child.flexGrow < 0) throw new Error(`Invalid flexGrow: ${child.flexGrow}`);
  if (child.flexShrink < 0) throw new Error(`Invalid flexShrink: ${child.flexShrink}`);
  if (child.flexBasis !== 'auto' && child.flexBasis < 0) throw new Error(`Invalid flexBasis: ${child.flexBasis}`);
  return { ...child, constraints: normalizeConstraints(child.constraints) };
}

export function resolveGap(gap: Gap, context: LayoutResolutionContext): number {
  if (gap === 'none') return 0;
  if (typeof gap === 'number') return gap;
  return context.responsiveTokens.get(gap.name) ?? gap.fallback;
}
