import type { Alignment, Alignment2D, CrossAxisAlignment, MainAxisAlignment } from './alignment.js';
import type { LayoutConstraints } from './layout-constraints.js';

export type ResponsiveToken = { kind: 'responsive-token'; name: string; fallback: number };
export type Gap = number | ResponsiveToken | 'none';
export type Axis = 'horizontal' | 'vertical';
export type FlexDirection = 'row' | 'column';
export type StackFit = 'loose' | 'expand' | 'passthrough';

export interface Spacing { top: number; right: number; bottom: number; left: number; }
export interface Positioned { top?: number; right?: number; bottom?: number; left?: number; width?: number; height?: number; }
export interface Background { color?: string; token?: string; }

export interface ChildLayout {
  flexGrow: number;
  flexShrink: number;
  flexBasis: number | 'auto';
  alignSelf: Alignment;
  order: number;
  constraints: LayoutConstraints;
  position?: Positioned;
  margin?: Spacing;
  padding?: Spacing;
}

export interface FlexLayout {
  kind: 'flex';
  direction: FlexDirection;
  mainAxisAlignment: MainAxisAlignment;
  crossAxisAlignment: CrossAxisAlignment;
  gap: Gap;
  wrap: boolean;
  reversed: boolean;
}

export interface StackLayout { kind: 'stack'; alignment: Alignment2D; fit: StackFit; clip: boolean; }
export interface ScrollLayout { kind: 'scroll'; axis: Axis; showIndicator: boolean; pagingEnabled: boolean; snap: boolean; }
export interface BoxLayout { kind: 'box'; padding?: Spacing; margin?: Spacing; background?: Background; }

export type ContainerLayout = FlexLayout | StackLayout | ScrollLayout | BoxLayout;

export interface LayoutNode {
  id: string;
  layout: ContainerLayout;
  child: ChildLayout;
  children: LayoutNode[];
}

export const zeroSpacing = (): Spacing => ({ top: 0, right: 0, bottom: 0, left: 0 });
export const allSpacing = (value: number): Spacing => ({ top: value, right: value, bottom: value, left: value });
export const defaultChildLayout = (): ChildLayout => ({
  flexGrow: 0,
  flexShrink: 1,
  flexBasis: 'auto',
  alignSelf: 'stretch',
  order: 0,
  constraints: { intrinsicSize: { kind: 'min-content' } },
});
