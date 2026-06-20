// CSS Intent Analyzer
// Analyzes CSS properties to infer layout intent (Centered, Grid, Stack, etc.)
// Pure rule-based with no AI calls — fast and deterministic.

import type { StyledNode, LayoutIntent, LayoutIntentType } from '@html-native/shared';

// -- Layout Intent Detection --

export function detectLayoutIntent(styled: StyledNode): LayoutIntent {
  const styles = styled.styles;
  const display = styles['display'] || '';
  const position = styles['position'] || '';
  const flexDirection = styles['flex-direction'] || '';
  const justifyContent = styles['justify-content'] || '';
  const alignItems = styles['align-items'] || '';
  const gridTemplate = styles['grid-template-columns'] || styles['grid-template-rows'] || '';
  const textAlign = styles['text-align'] || '';
  const width = styles['width'] || '';
  const margin = styles['margin'] || '';

  // Centered layout detection
  if (
    (textAlign === 'center' && display !== 'flex' && display !== 'grid') ||
    (margin === '0 auto' || margin === 'auto') ||
    (justifyContent === 'center' && alignItems === 'center')
  ) {
    return { type: 'Centered', properties: { display, justifyContent, alignItems }, confidence: 0.85 };
  }

  // Grid layout
  if (display === 'grid' || display === 'inline-grid') {
    if (gridTemplate.includes('repeat')) {
      const match = gridTemplate.match(/repeat\((\d+)/);
      if (match) {
        const cols = match[1];
        return {
          type: 'ResponsiveGrid',
          properties: { columns: cols, ...styles },
          confidence: 0.9,
        };
      }
    }
    return { type: 'Grid', properties: { ...styles }, confidence: 0.85 };
  }

  // Flexbox layouts
  if (display === 'flex' || display === 'inline-flex') {
    if (flexDirection === 'column' || !flexDirection) {
      return {
        type: 'FlexColumn',
        properties: { justifyContent, alignItems },
        confidence: 0.8,
      };
    }
    return {
      type: 'FlexRow',
      properties: { justifyContent, alignItems },
      confidence: 0.8,
    };
  }

  // Hero layout: full-width with large padding and centered text
  if (
    position === 'relative' &&
    textAlign === 'center' &&
    (parseInt(width) >= 100 || width.includes('100%') || width.includes('vw'))
  ) {
    return { type: 'HeroLayout', properties: { position, textAlign, width }, confidence: 0.75 };
  }

  // Sidebar layout: fixed positioned with specific width
  if (position === 'fixed' || position === 'sticky') {
    const w = parseInt(styles['width'] || '0');
    if (w > 0 && w <= 400) {
      return { type: 'SidebarLayout', properties: { position, width }, confidence: 0.7 };
    }
  }

  // Stack (default block layout)
  if (display === 'block' || !display) {
    return { type: 'Stack', properties: {}, confidence: 0.6 };
  }

  return { type: 'Unknown', properties: {}, confidence: 0 };
}

// -- Bulk analysis --

export function analyzeLayoutIntents(nodes: StyledNode[]): StyledNode[] {
  function walk(node: StyledNode): StyledNode {
    const result: StyledNode = {
      ...node,
      layoutIntent: detectLayoutIntent(node),
      children: node.children.map(walk),
    };
    return result;
  }
  return nodes.map(walk);
}

// -- Pattern descriptors for documentation and logging --

export const LAYOUT_PATTERNS: Record<LayoutIntentType, string> = {
  Centered: 'Content centered both horizontally and vertically',
  Grid: 'CSS Grid layout with explicit rows/columns',
  Stack: 'Vertical block stacking (default flow)',
  SidebarLayout: 'Fixed/sticky sidebar with constrained width',
  HeroLayout: 'Full-width section with large padding and centering',
  ResponsiveGrid: 'Responsive grid using repeat/auto-fit/auto-fill',
  FlexRow: 'Horizontal flexbox row',
  FlexColumn: 'Vertical flexbox column',
  Unknown: 'No clear layout pattern detected',
};

export function describeLayout(intent: LayoutIntent): string {
  return `${intent.type}: ${LAYOUT_PATTERNS[intent.type] ?? 'Unknown pattern'} (confidence: ${intent.confidence})`;
}
