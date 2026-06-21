import type { UiNode, GenerateResult, PlatformTarget, Result } from '@html-native/shared';
import { countNodes, escapeString, NodeEmitter, walkTree } from '@html-native/generator-core';
import { DiagnosticBag } from '@html-native/shared/diagnostics.js';

const swiftuiEmitter: NodeEmitter = {
  indentUnit: '    ',

  emitText(node: UiNode, indent: string): string {
    const val = node.value ?? '';
    return `${indent}Text("${escapeString(val)}")`;
  },

  emitButton(node: UiNode, indent: string, label: string, _children: string[]): string {
    const action = `${indent}    // action`;
    const a11y = node.accessibility;
    const labelMod = a11y?.label && a11y.label !== label
      ? `\n${indent}.accessibilityLabel("${escapeString(a11y.label)}")`
      : '';
    const hintMod = a11y?.hint
      ? `\n${indent}.accessibilityHint("${escapeString(a11y.hint)}")`
      : '';
    return `${indent}Button("${escapeString(label)}") {\n${action}\n${indent}}${labelMod}${hintMod}`;
  },

  emitRow(indent: string, children: string[]): string {
    if (!children.length) return `${indent}HStack {}`;
    return `${indent}HStack {\n${children.join('\n')}\n${indent}}`;
  },

  emitColumn(indent: string, children: string[]): string {
    if (!children.length) return `${indent}VStack {}`;
    return `${indent}VStack {\n${children.join('\n')}\n${indent}}`;
  },

  emitContainer(node: UiNode, indent: string, children: string[]): string {
    if (!children.length) return `${indent}Color.clear`;
    return `${indent}VStack {\n${children.join('\n')}\n${indent}}`;
  },

  emitCard(node: UiNode, indent: string, children: string[]): string {
    const child = children[0] || '';
    const a11y = node.accessibility;
    const labelMod = a11y?.label
      ? `\n${indent}.accessibilityLabel("${escapeString(a11y.label)}")`
      : '';
    return `${indent}VStack {\n${child}\n${indent}}\n${indent}.background(Color(.systemBackground))\n${indent}.cornerRadius(12)\n${indent}.shadow(radius: 4)${labelMod}`;
  },

  emitImage(node: UiNode, indent: string): string {
    const src = (node.properties.src as string) || '';
    const alt = (node.accessibility?.label || node.properties.alt as string || '') as string;
    const labelMod = alt
      ? `\n${indent}.accessibilityLabel("${escapeString(alt)}")`
      : '';
    return `${indent}Image("${escapeString(src)}")\n${indent}.resizable()\n${indent}.aspectRatio(contentMode: .fit)${labelMod}`;
  },

  emitTextField(node: UiNode, indent: string): string {
    const a11y = node.accessibility;
    const labelText = escapeString(a11y?.label || 'Input');
    const hintMod = a11y?.hint
      ? `\n${indent}.accessibilityHint("${escapeString(a11y.hint)}")`
      : '';
    return `${indent}TextField("${labelText}", text: .constant(""))\n${indent}.textFieldStyle(.roundedBorder)${hintMod}`;
  },

  emitAppBar(indent: string, title: string): string {
    return `${indent}.navigationTitle("${escapeString(title)}")`;
  },

  emitScrollView(indent: string, children: string[]): string {
    if (!children.length) return `${indent}ScrollView {}`;
    return `${indent}ScrollView {\n${indent}    LazyVStack {\n${children.join('\n')}\n${indent}    }\n${indent}}`;
  },

  emitForm(node: UiNode, indent: string, children: string[]): string {
    return `${indent}Form {\n${children.join('\n')}\n${indent}}`;
  },

  emitFooter(indent: string, children: string[]): string {
    if (!children.length) return `${indent}Spacer()`;
    return `${indent}VStack {\n${children.join('\n')}\n${indent}}`;
  },

  emitDefault(node: UiNode, indent: string, children: string[]): string {
    if (!children.length) {
      const val = node.value ?? '';
      if (val) {
        return `${indent}Text("${escapeString(val)}")`;
      }
      return `${indent}Spacer()`;
    }
    return `${indent}VStack {\n${children.join('\n')}\n${indent}}`;
  },
};

export function generate(node: UiNode, name: string = 'GeneratedView', sourceComments: boolean = false): Result<GenerateResult> {
  const bag = new DiagnosticBag();
  const start = performance.now();

  const body = walkTree(node, swiftuiEmitter, 0, sourceComments);
  const indentedBody = body
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n');

  const code = `import SwiftUI

struct ${name}: View {
    var body: some View {
${indentedBody}
    }
}
`;

  return bag.toResult({
    code,
    metadata: {
      platform: 'swiftui' as PlatformTarget,
      nodes: countNodes(node),
      duration: Math.round(performance.now() - start),
    },
  });
}
