export type IntrinsicSizeKind = 'min-content' | 'max-content' | 'fit-content' | 'expand' | 'fixed' | 'auto';

export type IntrinsicSize =
  | { kind: 'min-content' }
  | { kind: 'max-content' }
  | { kind: 'fit-content' }
  | { kind: 'expand' }
  | { kind: 'fixed'; value: number }
  | { kind: 'auto' };

export interface RelativeConstraintHint {
  axis: 'width' | 'height';
  edge: 'size' | 'min' | 'max';
  percent: number;
}

export interface LayoutConstraints {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  intrinsicSize: IntrinsicSize;
  relative?: readonly RelativeConstraintHint[];
}

export interface NormalizedLayoutConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  intrinsicSize: IntrinsicSize;
  relative: readonly RelativeConstraintHint[];
}

export const unconstrainedLayoutConstraints = (): LayoutConstraints => ({
  intrinsicSize: { kind: 'min-content' },
});

export function normalizeConstraints(constraints: LayoutConstraints): NormalizedLayoutConstraints {
  const minWidth = constraints.minWidth ?? 0;
  const minHeight = constraints.minHeight ?? 0;
  const maxWidth = constraints.maxWidth ?? Number.POSITIVE_INFINITY;
  const maxHeight = constraints.maxHeight ?? Number.POSITIVE_INFINITY;

  if (minWidth > maxWidth) throw new Error(`Invalid width constraints: minWidth ${minWidth} > maxWidth ${maxWidth}`);
  if (minHeight > maxHeight) throw new Error(`Invalid height constraints: minHeight ${minHeight} > maxHeight ${maxHeight}`);
  if (constraints.intrinsicSize.kind === 'fixed' && constraints.intrinsicSize.value < 0) {
    throw new Error(`Invalid fixed intrinsic size: ${constraints.intrinsicSize.value}`);
  }

  return { minWidth, maxWidth, minHeight, maxHeight, intrinsicSize: constraints.intrinsicSize, relative: constraints.relative ?? [] };
}
