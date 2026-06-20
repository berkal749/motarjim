import { UiNode } from '@html-native/shared';

export {
  selectWidget,
  suggestWidgetsForTree,
} from './widget-engine.js';
export type { SelectionContext, TreeWidgetSuggestions } from './widget-engine.js';

// -- Shared utilities --

export function countNodes(node: UiNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

export function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export function escapeStringExtra(s: string, extra: Record<string, string>): string {
  let result = s;
  for (const [char, replacement] of Object.entries(extra)) {
    result = result.split(char).join(replacement);
  }
  return result;
}

// -- Label extraction (shared IR logic) --

export function findTextLabel(node: UiNode): string {
  const textChild = node.children.find(c => c.type === 'Text');
  if (textChild) return textChild.value ?? '';
  if (node.value) return node.value;
  return String(node.properties?.label ?? '');
}

export function getNonTextChildren(node: UiNode): UiNode[] {
  return node.children.filter(c => c.type !== 'Text');
}

// -- Node Emitter interface --

export interface NodeEmitter {
  indentUnit: string;
  emitText(node: UiNode, indent: string): string;
  emitButton(indent: string, label: string, children: string[]): string;
  emitRow(indent: string, children: string[]): string;
  emitColumn(indent: string, children: string[]): string;
  emitContainer(node: UiNode, indent: string, children: string[]): string;
  emitCard(indent: string, children: string[]): string;
  emitImage(node: UiNode, indent: string): string;
  emitTextField(indent: string): string;
  emitAppBar(indent: string, title: string): string;
  emitScrollView(indent: string, children: string[]): string;
  emitForm(indent: string, children: string[]): string;
  emitFooter(indent: string, children: string[]): string;
  emitDefault(node: UiNode, indent: string, children: string[]): string;
}

// -- Shared traversal --

function walkChildren(node: UiNode, emitter: NodeEmitter, level: number): string[] {
  return node.children.map(c => walkTree(c, emitter, level));
}

export function walkTree(node: UiNode, emitter: NodeEmitter, level: number = 0): string {
  const i = emitter.indentUnit.repeat(level);
  const nextLevel = level + 1;

  switch (node.type) {
    case 'Text':
      return emitter.emitText(node, i);

    case 'Button': {
      const label = findTextLabel(node) || 'Button';
      const nonTextChildren = getNonTextChildren(node);
      const rendered = nonTextChildren.map(c => walkTree(c, emitter, nextLevel));
      return emitter.emitButton(i, label, rendered);
    }

    case 'Row':
      return emitter.emitRow(i, walkChildren(node, emitter, nextLevel));

    case 'Column':
      return emitter.emitColumn(i, walkChildren(node, emitter, nextLevel));

    case 'Container':
      return emitter.emitContainer(node, i, walkChildren(node, emitter, nextLevel));

    case 'NavigationBar':
    case 'AppBar': {
      const title = findTextLabel(node) || 'Title';
      return emitter.emitAppBar(i, title);
    }

    case 'Card':
      return emitter.emitCard(i, walkChildren(node, emitter, nextLevel));

    case 'Image':
      return emitter.emitImage(node, i);

    case 'TextField':
      return emitter.emitTextField(i);

    case 'ListView':
    case 'LazyList':
    case 'ScrollView':
      return emitter.emitScrollView(i, walkChildren(node, emitter, nextLevel));

    case 'Form':
      return emitter.emitForm(i, walkChildren(node, emitter, nextLevel));

    case 'Footer':
      return emitter.emitFooter(i, walkChildren(node, emitter, nextLevel));

    default:
      return emitter.emitDefault(node, i, walkChildren(node, emitter, nextLevel));
  }
}
