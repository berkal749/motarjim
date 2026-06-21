import type { UiNode, GenerateResult, PlatformTarget, Result } from '@html-native/shared';
import { countNodes, escapeString, NodeEmitter, walkTree } from '@html-native/generator-core';
import { DiagnosticBag } from '@html-native/shared/diagnostics.js';

const composeEmitter: NodeEmitter = {
  indentUnit: '    ',

  emitText(node: UiNode, indent: string): string {
    const val = node.value ?? '';
    return `${indent}Text(text = "${escapeString(val)}")`;
  },

  emitButton(node: UiNode, indent: string, label: string, children: string[]): string {
    const onClick = 'onClick = { }';
    const content = children.length
      ? children.join('\n')
      : `${indent}    Text(text = "${escapeString(label)}")`;
    const a11y = node.accessibility;
    const semantics = a11y?.role || a11y?.label
      ? `\n${indent}    .semantics {\n${indent}        ${a11y?.role ? `contentDescription = "${escapeString(a11y.label || label)}"` : ''}\n${indent}    }`
      : '';
    const role = a11y?.role ? `\n${indent}    ${a11y.role !== 'button' ? `.semantics { contentDescription = "${escapeString(a11y.label || label)}" }` : ''}` : '';
    return `${indent}Button(\n${indent}    ${onClick}\n${indent}) {\n${content}\n${indent}}${role}${semantics}`;
  },

  emitRow(indent: string, children: string[]): string {
    if (!children.length) return `${indent}Row {}`;
    return `${indent}Row(\n${indent}    horizontalArrangement = Arrangement.spacedBy(8.dp)\n${indent}) {\n${children.join('\n')}\n${indent}}`;
  },

  emitColumn(indent: string, children: string[]): string {
    if (!children.length) return `${indent}Column {}`;
    return `${indent}Column {\n${children.join('\n')}\n${indent}}`;
  },

  emitContainer(node: UiNode, indent: string, children: string[]): string {
    if (!children.length) return `${indent}Box(modifier = Modifier)`;
    return `${indent}Box(modifier = Modifier) {\n${children.join('\n')}\n${indent}}`;
  },

  emitCard(node: UiNode, indent: string, children: string[]): string {
    const child = children[0] || '';
    const a11y = node.accessibility;
    const semantics = a11y?.label
      ? `\n${indent}    .semantics {\n${indent}        contentDescription = "${escapeString(a11y.label)}"\n${indent}    }`
      : '';
    return `${indent}Card(\n${indent}    modifier = Modifier\n${indent}) {\n${child}\n${indent}}${semantics}`;
  },

  emitImage(node: UiNode, indent: string): string {
    const src = (node.properties.src as string) || '';
    const alt = (node.accessibility?.label || node.properties.alt as string || '') as string;
    return `${indent}Image(\n${indent}    painter = painterResource(id = R.drawable.${escapeString(src)}),\n${indent}    contentDescription = "${escapeString(alt)}"\n${indent})`;
  },

  emitTextField(node: UiNode, indent: string): string {
    const a11y = node.accessibility;
    const labelText = escapeString(a11y?.label || 'Input');
    const hintText = a11y?.hint ? `,\n${indent}    placeholder = { Text("${escapeString(a11y.hint)}") }` : '';
    return `${indent}OutlinedTextField(\n${indent}    value = "",\n${indent}    onValueChange = { },\n${indent}    label = { Text("${labelText}") }${hintText}\n${indent})`;
  },

  emitAppBar(indent: string, title: string): string {
    return `${indent}TopAppBar(\n${indent}    title = { Text("${escapeString(title)}") }\n${indent})`;
  },

  emitScrollView(indent: string, children: string[]): string {
    if (!children.length) return `${indent}LazyColumn {}`;
    return `${indent}LazyColumn {\n${children.join('\n')}\n${indent}}`;
  },

  emitForm(node: UiNode, indent: string, children: string[]): string {
    return `${indent}Column {\n${children.join('\n')}\n${indent}}`;
  },

  emitFooter(indent: string, children: string[]): string {
    return `${indent}Column {\n${children.join('\n')}\n${indent}}`;
  },

  emitDefault(node: UiNode, indent: string, children: string[]): string {
    if (!children.length) {
      const val = node.value ?? '';
      if (val) {
        return `${indent}Text(text = "${escapeString(val)}")`;
      }
      return `${indent}Spacer(modifier = Modifier.size(0.dp))`;
    }
    return `${indent}Column {\n${children.join('\n')}\n${indent}}`;
  },
};

export function generate(node: UiNode, name: string = 'GeneratedView', sourceComments: boolean = false): Result<GenerateResult> {
  const bag = new DiagnosticBag();
  const start = performance.now();

  const body = walkTree(node, composeEmitter, 0, sourceComments);
  const indentedBody = body
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n');

  const code = `import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier

@Composable
fun ${name}() {
${indentedBody}
}
`;

  return bag.toResult({
    code,
    metadata: {
      platform: 'compose' as PlatformTarget,
      nodes: countNodes(node),
      duration: Math.round(performance.now() - start),
    },
  });
}
