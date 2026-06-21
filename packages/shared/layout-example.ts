import { resolveLayoutTree, type ResolvedLayoutNode } from './layout-engine.js';
import { defaultChildLayout, type LayoutNode } from './layout-types.js';

export const htmlButtonLayoutNode: LayoutNode = {
  id: 'button#submit',
  layout: {
    kind: 'box',
    padding: { top: 10, right: 16, bottom: 10, left: 16 },
    background: { token: 'button.primary.background' },
  },
  child: {
    ...defaultChildLayout(),
    constraints: {
      minWidth: 64,
      minHeight: 40,
      intrinsicSize: { kind: 'fit-content' },
    },
  },
  children: [
    {
      id: 'button#submit/text',
      layout: { kind: 'box' },
      child: {
        ...defaultChildLayout(),
        alignSelf: 'center',
        constraints: { intrinsicSize: { kind: 'min-content' } },
      },
      children: [],
    },
  ],
};

export const resolvedHtmlButtonLayoutTree: ResolvedLayoutNode = resolveLayoutTree(htmlButtonLayoutNode);

export function createButtonExample(): { source: 'HTML button'; layoutNode: LayoutNode; resolved: ResolvedLayoutNode } {
  return { source: 'HTML button', layoutNode: htmlButtonLayoutNode, resolved: resolvedHtmlButtonLayoutTree };
}
