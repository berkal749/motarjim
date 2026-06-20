import { UiNode } from '@html-native/shared';

export interface OptimizationPass {
  name: string;
  run: (node: UiNode) => UiNode;
}

// -- Existing passes (preserved) --

function mergeTextNodes(node: UiNode): UiNode {
  const merged: UiNode[] = [];
  for (const child of node.children) {
    const optimized = mergeTextNodes(child);
    if (optimized.type === 'Text' && merged.length > 0 && merged[merged.length - 1].type === 'Text') {
      const prev = merged[merged.length - 1];
      prev.value = ((prev.value || '') + ' ' + (optimized.value || '')).trim();
      prev.properties.value = prev.value;
    } else {
      merged.push(optimized);
    }
  }
  return { ...node, children: merged };
}

function flattenContainers(node: UiNode): UiNode {
  const children = node.children.map(flattenContainers);

  if (
    (node.type === 'Container' || node.type === 'Unknown') &&
    children.length === 1 &&
    Object.keys(node.properties).length === 0
  ) {
    return children[0];
  }

  return { ...node, children };
}

function removeEmptyText(node: UiNode): UiNode {
  const children = node.children
    .map(removeEmptyText)
    .filter(child => {
      if (child.type === 'Text' && (!child.value || child.value.trim() === '')) {
        return false;
      }
      return true;
    });

  return { ...node, children };
}

// -- New passes --

function removeRedundantNesting(node: UiNode): UiNode {
  const children = node.children.map(removeRedundantNesting);

  // If a Container wraps another Container with no additional properties, merge them
  if (
    (node.type === 'Container' || node.type === 'Unknown') &&
    children.length === 1 &&
    (children[0].type === 'Container' || children[0].type === 'Unknown') &&
    Object.keys(node.properties).length === 0
  ) {
    const inner = children[0];
    return {
      ...inner,
      properties: { ...node.properties, ...inner.properties },
      children: inner.children,
    };
  }

  // If a single-child Column/Row with no props collapses to its child
  if (
    (node.type === 'Column' || node.type === 'Row') &&
    children.length === 1 &&
    Object.keys(node.properties).length === 0
  ) {
    return children[0];
  }

  return { ...node, children };
}

function simplifyLayout(node: UiNode): UiNode {
  const children = node.children.map(simplifyLayout);

  // Text node inside a Container with no other children -> just Text
  if (
    (node.type === 'Container' || node.type === 'Unknown') &&
    children.length === 1 &&
    children[0].type === 'Text' &&
    Object.keys(node.properties).length === 0
  ) {
    return children[0];
  }

  // Empty Container -> Spacer or Text('')
  if (
    (node.type === 'Container' || node.type === 'Unknown') &&
    children.length === 0 &&
    Object.keys(node.properties).length === 0 &&
    !node.value
  ) {
    return { type: 'Spacer', properties: {}, children: [] };
  }

  // Button with only Text child -> preserve, but merge value
  if (node.type === 'Button' && children.length === 1 && children[0].type === 'Text') {
    const textVal = children[0].value ?? '';
    return {
      ...node,
      value: textVal,
      properties: { ...node.properties, label: textVal },
      children: [],
    };
  }

  return { ...node, children };
}

function mergeSemanticNodes(node: UiNode): UiNode {
  const children = node.children.map(mergeSemanticNodes);

  const merged: UiNode[] = [];
  for (const child of children) {
    const last = merged[merged.length - 1];

    if (
      last &&
      child.type === last.type &&
      child.semanticIntent === last.semanticIntent &&
      child.semanticIntent &&
      child.semanticIntent !== 'Unknown' &&
      !child.value &&
      !last.value
    ) {
      // Merge children of adjacent nodes with same semantic intent
      last.children.push(...child.children);
    } else {
      merged.push({ ...child });
    }
  }

  return { ...node, children: merged };
}

function optimizeForResponsive(node: UiNode): UiNode {
  const children = node.children.map(optimizeForResponsive);

  if (node.responsiveMetadata && node.responsiveMetadata.breakpoints.length > 0 && node.children.length > 0) {
    const metadata = node.responsiveMetadata;

    if (metadata.mobileFirst && children.length > 3) {
      return {
        ...node,
        type: 'ScrollView',
        children,
        properties: {
          ...node.properties,
          responsive: true,
          scrollDirection: 'vertical',
        },
      };
    }
  }

  return { ...node, children };
}

// -- Default passes (existing + new) --

export const defaultPasses: OptimizationPass[] = [
  { name: 'removeEmptyText', run: removeEmptyText },
  { name: 'mergeTextNodes', run: mergeTextNodes },
  { name: 'flattenContainers', run: flattenContainers },
  { name: 'removeRedundantNesting', run: removeRedundantNesting },
  { name: 'simplifyLayout', run: simplifyLayout },
  { name: 'mergeSemanticNodes', run: mergeSemanticNodes },
  { name: 'optimizeForResponsive', run: optimizeForResponsive },
];

export function optimize(ir: UiNode, passes: OptimizationPass[] = defaultPasses): UiNode {
  let node = { ...ir };
  for (const pass of passes) {
    node = pass.run(node);
  }
  return node;
}
