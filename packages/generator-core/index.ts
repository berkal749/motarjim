import { UiNode, SourceSpan } from '@html-native/shared';

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
  emitButton(node: UiNode, indent: string, label: string, children: string[]): string;
  emitRow(indent: string, children: string[]): string;
  emitColumn(indent: string, children: string[]): string;
  emitContainer(node: UiNode, indent: string, children: string[]): string;
  emitCard(node: UiNode, indent: string, children: string[]): string;
  emitImage(node: UiNode, indent: string): string;
  emitTextField(node: UiNode, indent: string): string;
  emitAppBar(indent: string, title: string): string;
  emitScrollView(indent: string, children: string[]): string;
  emitForm(node: UiNode, indent: string, children: string[]): string;
  emitFooter(indent: string, children: string[]): string;
  emitDefault(node: UiNode, indent: string, children: string[]): string;
}

// -- Source tracking helpers --

export function formatSourcePos(span: SourceSpan): string {
  return `${span.file}:${span.start.line}:${span.start.column}`;
}

// -- Shared traversal --

function walkChildren(node: UiNode, emitter: NodeEmitter, level: number, sourceComments: boolean): string[] {
  return node.children.map(c => walkTree(c, emitter, level, sourceComments));
}

export function walkTree(node: UiNode, emitter: NodeEmitter, level: number = 0, sourceComments: boolean = false): string {
  const i = emitter.indentUnit.repeat(level);
  const nextLevel = level + 1;

  const sourcePrefix = sourceComments && node.sourceSpan
    ? `${i}// ${formatSourcePos(node.sourceSpan)}\n`
    : '';

  let result: string;

  switch (node.type) {
    case 'Text':
      result = emitter.emitText(node, i);
      break;

    case 'Button': {
      const label = findTextLabel(node) || 'Button';
      const nonTextChildren = getNonTextChildren(node);
      const rendered = nonTextChildren.map(c => walkTree(c, emitter, nextLevel, sourceComments));
      result = emitter.emitButton(node, i, label, rendered);
      break;
    }

    case 'Row':
      result = emitter.emitRow(i, walkChildren(node, emitter, nextLevel, sourceComments));
      break;

    case 'Column':
      result = emitter.emitColumn(i, walkChildren(node, emitter, nextLevel, sourceComments));
      break;

    case 'Container':
      result = emitter.emitContainer(node, i, walkChildren(node, emitter, nextLevel, sourceComments));
      break;

    case 'NavigationBar':
    case 'AppBar': {
      const title = findTextLabel(node) || 'Title';
      result = emitter.emitAppBar(i, title);
      break;
    }

    case 'Card':
      result = emitter.emitCard(node, i, walkChildren(node, emitter, nextLevel, sourceComments));
      break;

    case 'Image':
      result = emitter.emitImage(node, i);
      break;

    case 'TextField':
      result = emitter.emitTextField(node, i);
      break;

    case 'ListView':
    case 'LazyList':
    case 'ScrollView':
      result = emitter.emitScrollView(i, walkChildren(node, emitter, nextLevel, sourceComments));
      break;

    case 'Form':
      result = emitter.emitForm(node, i, walkChildren(node, emitter, nextLevel, sourceComments));
      break;

    case 'Footer':
      result = emitter.emitFooter(i, walkChildren(node, emitter, nextLevel, sourceComments));
      break;

    default:
      result = emitter.emitDefault(node, i, walkChildren(node, emitter, nextLevel, sourceComments));
      break;
  }

  return sourcePrefix + result;
}
