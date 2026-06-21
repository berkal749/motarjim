import type {
  StyledNode,
  HtmlNode,
  AccessibilityInfo,
  AccessibilityIssue,
  AccessibilityNode,
  AccessibilityTree,
  Result,
} from '@html-native/shared';
import { DiagnosticBag } from '@html-native/shared/diagnostics.js';

export type { AccessibilityInfo, AccessibilityIssue, AccessibilityNode, AccessibilityTree };

// ============================================================
// Heading Hierarchy Checker
// ============================================================

function isHeading(tag: string): tag is `h${1 | 2 | 3 | 4 | 5 | 6}` {
  return /^h[1-6]$/.test(tag);
}

function headingLevel(tag: string): number {
  if (!isHeading(tag)) return 0;
  return parseInt(tag[1], 10);
}

function checkHeadingHierarchy(
  nodes: StyledNode[],
  issues: AccessibilityIssue[],
  expectedLevel: number = 1,
): number {
  let nextExpected = expectedLevel;

  for (const node of nodes) {
    const tag = node.node.tagName;

    if (isHeading(tag)) {
      const level = headingLevel(tag);

      if (level > nextExpected + 1) {
        issues.push({
          code: 'A11Y_HEADING_SKIP',
          message: `Heading hierarchy skipped from h${nextExpected} to h${level}. Use h${nextExpected + 1} instead.`,
          severity: 'warning',
          nodeId: node.node.nodeId,
          tagName: tag,
          sourceSpan: node.node.sourceSpan,
        });
      }

      nextExpected = level + 1;
    }

    const childNext = checkHeadingHierarchy(node.children, issues, nextExpected);
    nextExpected = Math.max(nextExpected, childNext);
  }

  return nextExpected;
}

// ============================================================
// Image Alt Checker
// ============================================================

function checkImages(nodes: StyledNode[], issues: AccessibilityIssue[]): void {
  for (const node of nodes) {
    if (node.node.tagName === 'img') {
      const altAttr = node.node.attributes.find(a => a.name === 'alt');
      const roleAttr = node.node.attributes.find(a => a.name === 'role');
      const isPresentation = roleAttr?.value === 'presentation';

      if (!altAttr) {
        issues.push({
          code: 'A11Y_IMG_NO_ALT',
          message: 'Image is missing an alt attribute. Add alt text for screen readers or alt="" if decorative.',
          severity: 'warning',
          nodeId: node.node.nodeId,
          tagName: 'img',
          sourceSpan: node.node.sourceSpan,
        });
      } else if (!altAttr.value.trim() && !isPresentation) {
        issues.push({
          code: 'A11Y_IMG_EMPTY_ALT',
          message: 'Image has an empty alt attribute. If decorative, add role="presentation". Otherwise, provide descriptive alt text.',
          severity: 'info',
          nodeId: node.node.nodeId,
          tagName: 'img',
          sourceSpan: node.node.sourceSpan,
        });
      }
    }

    checkImages(node.children, issues);
  }
}

// ============================================================
// Button Label Checker
// ============================================================

function getTextContent(node: HtmlNode): string {
  const parts: string[] = [];
  if (node.value) parts.push(node.value);
  for (const child of node.children) {
    parts.push(getTextContent(child));
  }
  return parts.join(' ').trim();
}

function hasVisibleText(node: HtmlNode): boolean {
  for (const child of node.children) {
    if (child.tagName === '#text' && child.value && child.value.trim()) return true;
    if (child.tagName !== '#text' && hasVisibleText(child)) return true;
  }
  return false;
}

function checkButtons(nodes: StyledNode[], issues: AccessibilityIssue[]): void {
  for (const node of nodes) {
    const tag = node.node.tagName;
    const isButton = tag === 'button';

    if (isButton) {
      const ariaLabel = node.node.attributes.find(a => a.name === 'aria-label');
      const hasText = hasVisibleText(node.node);

      if (!ariaLabel && !hasText) {
        issues.push({
          code: 'A11Y_BUTTON_NO_LABEL',
          message: 'Button has no accessible label. Add text content or an aria-label attribute.',
          severity: 'warning',
          nodeId: node.node.nodeId,
          tagName: 'button',
          sourceSpan: node.node.sourceSpan,
        });
      }

      const disabledAttr = node.node.attributes.find(a => a.name === 'disabled');
      if (disabledAttr === undefined) {
        const typeAttr = node.node.attributes.find(a => a.name === 'type');
        if (typeAttr && (typeAttr.value === 'submit' || typeAttr.value === 'reset') && !ariaLabel && !hasText) {
          issues.push({
            code: 'A11Y_BUTTON_NO_LABEL',
            message: `Submit/reset button has no accessible label. Add text content or aria-label.`,
            severity: 'warning',
            nodeId: node.node.nodeId,
            tagName: 'button',
            sourceSpan: node.node.sourceSpan,
          });
        }
      }
    }

    if (tag === 'a' && node.node.attributes.some(a => a.name === 'role' && a.value === 'button')) {
      const ariaLabel = node.node.attributes.find(a => a.name === 'aria-label');
      const hasText = hasVisibleText(node.node);

      if (!ariaLabel && !hasText) {
        issues.push({
          code: 'A11Y_BUTTON_NO_LABEL',
          message: 'Link with role="button" has no accessible label.',
          severity: 'warning',
          nodeId: node.node.nodeId,
          tagName: 'a',
          sourceSpan: node.node.sourceSpan,
        });
      }
    }

    checkButtons(node.children, issues);
  }
}

// ============================================================
// Input Label Checker
// ============================================================

function getInputType(node: HtmlNode): string | undefined {
  const typeAttr = node.attributes.find(a => a.name === 'type');
  return typeAttr?.value;
}

function findLabelForInput(nodes: StyledNode[], inputId: string): StyledNode | undefined {
  for (const node of nodes) {
    if (node.node.tagName === 'label') {
      const forAttr = node.node.attributes.find(a => a.name === 'for');
      if (forAttr && forAttr.value === inputId) return node;
    }
    const found = findLabelForInput(node.children, inputId);
    if (found) return found;
  }
  return undefined;
}

function isLabeledByAria(node: HtmlNode): boolean {
  return node.attributes.some(a =>
    a.name === 'aria-labelledby' || a.name === 'aria-label'
  );
}

function isHidden(node: HtmlNode): boolean {
  return node.attributes.some(a =>
    a.name === 'type' && a.value === 'hidden'
  ) || node.attributes.some(a =>
    a.name === 'aria-hidden' && a.value === 'true'
  );
}

function checkInputs(nodes: StyledNode[], allNodes: StyledNode[], issues: AccessibilityIssue[]): void {
  for (const node of nodes) {
    const tag = node.node.tagName;
    const isInputLike = tag === 'input' || tag === 'textarea' || tag === 'select';

    if (isInputLike && !isHidden(node.node)) {
      const idAttr = node.node.attributes.find(a => a.name === 'id');
      const hasExplicitLabel = idAttr ? !!findLabelForInput(allNodes, idAttr.value) : false;
      const hasAriaLabel = isLabeledByAria(node.node);
      const isWrappedByLabel = false;
      const placeholder = node.node.attributes.find(a => a.name === 'placeholder');
      const hasPlaceholder = !!placeholder && !!placeholder.value;

      if (!hasExplicitLabel && !hasAriaLabel && !isWrappedByLabel) {
        const inputType = getInputType(node.node);
        const typeSuffix = inputType ? ` type="${inputType}"` : '';

        if (tag === 'input' && (inputType === 'submit' || inputType === 'reset' || inputType === 'button')) {
          const valueAttr = node.node.attributes.find(a => a.name === 'value');
          if (!valueAttr || !valueAttr.value.trim()) {
            issues.push({
              code: 'A11Y_INPUT_NO_LABEL',
              message: `Input${typeSuffix} has no accessible label. Use a value attribute or aria-label.`,
              severity: 'warning',
              nodeId: node.node.nodeId,
              tagName: tag,
              sourceSpan: node.node.sourceSpan,
            });
          }
        } else {
          const severity = hasPlaceholder ? 'info' : 'warning';
          issues.push({
            code: 'A11Y_INPUT_NO_LABEL',
            message: `${tag === 'textarea' ? 'Textarea' : 'Input'}${typeSuffix} lacks an associated label. Use <label for="id">, aria-label, or wrap in a <label>.`,
            severity,
            nodeId: node.node.nodeId,
            tagName: tag,
            sourceSpan: node.node.sourceSpan,
          });
        }
      }
    }

    checkInputs(node.children, allNodes, issues);
  }
}

// ============================================================
// Accessibility Tree Builder
// ============================================================

function inferRole(node: StyledNode): string {
  const tag = node.node.tagName;
  const roleAttr = node.node.attributes.find(a => a.name === 'role');
  if (roleAttr) return roleAttr.value;

  const ariaRole = node.node.attributes.find(a => a.name === 'aria-role');
  if (ariaRole) return ariaRole.value;

  const classAttr = node.node.attributes.find(a => a.name === 'class');
  const classes = classAttr ? classAttr.value.split(/\s+/) : [];

  const roleMap: Record<string, string> = {
    nav: 'navigation',
    header: 'banner',
    footer: 'contentinfo',
    main: 'main',
    aside: 'complementary',
    article: 'article',
    section: 'region',
    form: 'form',
    button: 'button',
    a: 'link',
    img: 'img',
    input: getInputType(node.node) === 'checkbox' ? 'checkbox'
      : getInputType(node.node) === 'radio' ? 'radio'
      : 'textbox',
    textarea: 'textbox',
    select: 'combobox',
    ul: 'list',
    ol: 'list',
    li: 'listitem',
    table: 'table',
    h1: 'heading',
    h2: 'heading',
    h3: 'heading',
    h4: 'heading',
    h5: 'heading',
    h6: 'heading',
    p: 'paragraph',
  };

  if (tag in roleMap) return roleMap[tag];

  if (classes.some(c => ['card', 'card-body', 'card-content'].includes(c))) return 'article';
  if (classes.some(c => ['nav', 'navbar', 'navigation'].includes(c))) return 'navigation';
  if (classes.some(c => ['sidebar', 'side-bar', 'drawer'].includes(c))) return 'complementary';
  if (classes.some(c => ['dialog', 'modal', 'overlay'].includes(c))) return 'dialog';
  if (classes.some(c => ['tab', 'tab-panel'].includes(c))) return 'tab';
  if (classes.some(c => ['alert', 'error', 'notification'].includes(c))) return 'alert';

  return 'generic';
}

function getAccessibleLabel(node: StyledNode): string | undefined {
  const ariaLabel = node.node.attributes.find(a => a.name === 'aria-label');
  if (ariaLabel?.value.trim()) return ariaLabel.value.trim();

  const ariaLabelledBy = node.node.attributes.find(a => a.name === 'aria-labelledby');
  if (ariaLabelledBy?.value.trim()) return `(referenced by #${ariaLabelledBy.value})`;

  if (node.node.tagName === 'img') {
    const alt = node.node.attributes.find(a => a.name === 'alt');
    if (alt?.value.trim()) return alt.value.trim();
  }

  if (node.node.tagName === 'input' || node.node.tagName === 'textarea') {
    const placeholder = node.node.attributes.find(a => a.name === 'placeholder');
    if (placeholder?.value.trim()) return placeholder.value.trim();
  }

  if (node.node.tagName === 'a') {
    const text = getTextContent(node.node);
    if (text) return text;
    const href = node.node.attributes.find(a => a.name === 'href');
    if (href) return `link to ${href.value}`;
  }

  if (node.node.tagName === 'button') {
    const text = getTextContent(node.node);
    if (text) return text;
  }

  const text = getTextContent(node.node);
  if (text && text.length < 200) return text;

  return undefined;
}

function getAccessibleHint(node: StyledNode): string | undefined {
  const describedBy = node.node.attributes.find(a => a.name === 'aria-describedby');
  if (describedBy?.value.trim()) return `(described by #${describedBy.value})`;

  if (node.node.tagName === 'input' || node.node.tagName === 'textarea') {
    const placeholder = node.node.attributes.find(a => a.name === 'placeholder');
    if (placeholder?.value.trim()) return placeholder.value.trim();
    const title = node.node.attributes.find(a => a.name === 'title');
    if (title?.value.trim()) return title.value.trim();
  }

  return undefined;
}

function isElementHidden(node: StyledNode): boolean {
  return node.node.attributes.some(a =>
    a.name === 'aria-hidden' && a.value === 'true'
  ) || node.styles['display'] === 'none';
}

function buildAccessibilityNode(node: StyledNode, issues: AccessibilityIssue[], startFocusOrder: number): { node: AccessibilityNode; nextFocusOrder: number } {
  let focusOrder = startFocusOrder;
  const nodeIssues = issues.filter(i => i.nodeId === node.node.nodeId);

  const tag = node.node.tagName;
  const isFocusable = tag === 'button' || tag === 'a' || tag === 'input' || tag === 'textarea' || tag === 'select'
    || node.node.attributes.some(a => a.name === 'tabindex');

  if (isFocusable && !isElementHidden(node)) {
    const tabindex = node.node.attributes.find(a => a.name === 'tabindex');
    if (!tabindex || parseInt(tabindex.value, 10) >= 0) {
      focusOrder++;
    }
  }

  const role = inferRole(node);
  const label = getAccessibleLabel(node);
  const hint = getAccessibleHint(node);

  const a11yNode: AccessibilityNode = {
    nodeId: node.node.nodeId,
    role,
    label,
    hint,
    focusOrder: isFocusable ? focusOrder : undefined,
    children: [],
    issues: nodeIssues,
  };

  let nextOrder = focusOrder;
  for (const child of node.children) {
    const result = buildAccessibilityNode(child, issues, nextOrder);
    a11yNode.children.push(result.node);
    nextOrder = result.nextFocusOrder;
  }

  return { node: a11yNode, nextFocusOrder: nextOrder };
}

// ============================================================
// Main Analyzer
// ============================================================

export interface AccessibilityResult {
  issues: AccessibilityIssue[];
  tree: AccessibilityTree;
  perNodeInfo: Map<string, AccessibilityInfo>;
}

export function analyzeAccessibility(styledNodes: StyledNode[]): Result<AccessibilityResult> {
  const bag = new DiagnosticBag();
  const issues: AccessibilityIssue[] = [];

  // Run all checks
  checkHeadingHierarchy(styledNodes, issues);
  checkImages(styledNodes, issues);
  checkButtons(styledNodes, issues);
  checkInputs(styledNodes, styledNodes, issues);

  // Build per-node accessibility info
  const perNodeInfo = new Map<string, AccessibilityInfo>();

  function collectInfo(nodes: StyledNode[]): void {
    for (const node of nodes) {
      const role = inferRole(node);
      const label = getAccessibleLabel(node);
      const hint = getAccessibleHint(node);
      const hidden = isElementHidden(node);

      perNodeInfo.set(node.node.nodeId, {
        role,
        label,
        hint,
        hidden,
      });

      collectInfo(node.children);
    }
  }

  collectInfo(styledNodes);

  // Build accessibility tree
  const treeRoots: AccessibilityNode[] = [];
  let nextOrder = 0;
  for (const node of styledNodes) {
    const result = buildAccessibilityNode(node, issues, nextOrder);
    treeRoots.push(result.node);
    nextOrder = result.nextFocusOrder;
  }

  const tree: AccessibilityTree = {
    issues,
    tree: treeRoots,
  };

  // Add issues as diagnostics
  for (const issue of issues) {
    if (issue.severity === 'error') {
      bag.addError(issue.code, issue.message, 'accessibility', issue.sourceSpan);
    } else if (issue.severity === 'warning') {
      bag.addWarning(issue.code, issue.message, 'accessibility', issue.sourceSpan);
    } else {
      bag.addInfo(issue.code, issue.message, 'accessibility', issue.sourceSpan);
    }
  }

  return bag.toResult({ issues, tree, perNodeInfo });
}

export function formatAccessibilityTree(tree: AccessibilityNode, indent: string = ''): string {
  const lines: string[] = [];
  const focus = tree.focusOrder !== undefined ? ` [focus=${tree.focusOrder}]` : '';
  const labelStr = tree.label ? ` label="${tree.label}"` : '';
  const hintStr = tree.hint ? ` hint="${tree.hint}"` : '';
  lines.push(`${indent}<${tree.role}${labelStr}${hintStr}${focus}>`);

  for (const issue of tree.issues) {
    lines.push(`${indent}  ⚠ ${issue.code}: ${issue.message}`);
  }

  for (const child of tree.children) {
    lines.push(formatAccessibilityTree(child, indent + '  '));
  }

  return lines.join('\n');
}
