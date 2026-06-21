export type MainAxisAlignment =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

export type CrossAxisAlignment = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

export type Alignment = CrossAxisAlignment;

export type Alignment2D =
  | 'center'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export const canonicalAlignments2D: readonly Alignment2D[] = [
  'center',
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

export interface AlignmentVector2D {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
}

export function alignment2DVector(alignment: Alignment2D): AlignmentVector2D {
  switch (alignment) {
    case 'top-left': return { x: -1, y: -1 };
    case 'top-center': return { x: 0, y: -1 };
    case 'top-right': return { x: 1, y: -1 };
    case 'center-left': return { x: -1, y: 0 };
    case 'center': return { x: 0, y: 0 };
    case 'center-right': return { x: 1, y: 0 };
    case 'bottom-left': return { x: -1, y: 1 };
    case 'bottom-center': return { x: 0, y: 1 };
    case 'bottom-right': return { x: 1, y: 1 };
  }
}
