// Responsive Intelligence Analyzer
// Detects responsive patterns (mobile-first, breakpoints, responsive grids)
// and generates responsive metadata for the IR pipeline.

import type { CssStylesheet, ResponsiveMetadata, Breakpoint, LayoutIntent } from '@html-native/shared';
import { detectLayoutIntent } from './intent.js';

// -- Breakpoint classification --

export const BREAKPOINT_LABELS: Record<string, string> = {
  '576px': 'mobile',
  '600px': 'mobile',
  '640px': 'mobile',
  '768px': 'tablet',
  '800px': 'tablet',
  '992px': 'desktop',
  '1024px': 'desktop',
  '1200px': 'wide',
  '1280px': 'wide',
  '1440px': 'wide',
};

export function classifyBreakpoint(value: string): string {
  return BREAKPOINT_LABELS[value] || 'custom';
}

// -- Detect mobile-first vs desktop-first --

export function detectMobileFirst(stylesheet: CssStylesheet): boolean {
  const minWidthCount = stylesheet.mediaQueries.filter(mq =>
    mq.condition.includes('min-width')
  ).length;
  const maxWidthCount = stylesheet.mediaQueries.filter(mq =>
    mq.condition.includes('max-width')
  ).length;

  // More min-width queries = mobile-first approach
  if (minWidthCount > maxWidthCount) return true;
  if (maxWidthCount > minWidthCount) return false;

  // Tiebreaker: check if the smallest breakpoint is min-width
  const smallestMin = stylesheet.mediaQueries
    .filter(mq => mq.condition.includes('min-width'))
    .map(mq => {
      const match = mq.condition.match(/min-width\s*:\s*(\d+)/);
      return match ? parseInt(match[1]) : Infinity;
    })
    .sort((a, b) => a - b);

  if (smallestMin.length > 0 && smallestMin[0] <= 768) return true;

  return true; // Default to mobile-first
}

// -- Extract breakpoints from stylesheet --

export function extractBreakpoints(stylesheet: CssStylesheet): Breakpoint[] {
  const breakpoints: Breakpoint[] = [];
  const seen = new Set<string>();

  for (const mq of stylesheet.mediaQueries) {
    const minMatch = mq.condition.match(/min-width\s*:\s*([^)\s]+)/);
    const maxMatch = mq.condition.match(/max-width\s*:\s*([^)\s]+)/);

    let condition: Breakpoint['condition'] | null = null;
    let value = '';

    if (minMatch) {
      condition = 'min-width';
      value = minMatch[1];
    } else if (maxMatch) {
      condition = 'max-width';
      value = maxMatch[1];
    }

    if (condition && value) {
      const key = `${condition}:${value}`;
      if (!seen.has(key)) {
        seen.add(key);
        const layoutHints: LayoutIntent[] = mq.rules.map(rule => {
          const mockStyled = {
            node: { nodeId: '', tagName: 'div', attributes: [], children: [] },
            styles: Object.fromEntries(
              rule.declarations.map(d => [d.property, d.value])
            ),
            children: [],
          };
          return detectLayoutIntent(mockStyled);
        });

        breakpoints.push({
          condition,
          value,
          layoutHints,
        });
      }
    }
  }

  return breakpoints;
}

// -- Determine preferred layout name from breakpoints --

export function determinePreferredLayout(breakpoints: Breakpoint[]): string {
  if (breakpoints.length === 0) return 'single-column';

  const bpValues = breakpoints.map(b => {
    const num = parseInt(b.value);
    return { ...b, numericValue: isNaN(num) ? 0 : num };
  }).sort((a, b) => a.numericValue - b.numericValue);

  // Desktop-first if largest breakpoint is min-width (scaling up)
  // Mobile-first if smallest breakpoint is max-width (scaling down)
  if (bpValues.length > 0 && bpValues[0].condition === 'max-width') {
    return 'desktop-first';
  }

  return 'mobile-first';
}

// -- Build responsive metadata from stylesheet --

export function buildResponsiveMetadata(stylesheet: CssStylesheet): ResponsiveMetadata {
  const breakpoints = extractBreakpoints(stylesheet);
  const mobileFirst = detectMobileFirst(stylesheet);
  const preferredLayout = determinePreferredLayout(breakpoints);

  return {
    breakpoints,
    preferredLayout,
    mobileFirst,
  };
}

// -- Responsive pattern detection --

export interface ResponsivePattern {
  name: string;
  description: string;
  breakpoints: string[];
}

export function detectResponsivePatterns(stylesheet: CssStylesheet): ResponsivePattern[] {
  const patterns: ResponsivePattern[] = [];

  // Check for responsive grid patterns
  const gridRules = stylesheet.rules.filter(r =>
    r.declarations.some(d =>
      d.property === 'grid-template-columns' && d.value.includes('auto-fill') || d.value.includes('auto-fit')
    )
  );
  if (gridRules.length > 0) {
    patterns.push({
      name: 'responsive-grid',
      description: 'Auto-fill/auto-fit responsive grid',
      breakpoints: stylesheet.mediaQueries.map(mq => mq.condition),
    });
  }

  // Check for responsive navigation
  const navRules = stylesheet.rules.filter(r =>
    r.selectors.some(s =>
      s.includes('nav') || s.includes('.navbar') || s.includes('.menu') || s.includes('.hamburger')
    )
  );
  if (navRules.length > 0 && stylesheet.mediaQueries.length > 0) {
    patterns.push({
      name: 'responsive-navigation',
      description: 'Navigation with responsive breakpoints',
      breakpoints: stylesheet.mediaQueries.map(mq => mq.condition),
    });
  }

  return patterns;
}
