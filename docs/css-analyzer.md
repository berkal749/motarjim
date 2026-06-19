# CSS Analyzer

## Purpose

Parses CSS stylesheets, matches selectors to HTML nodes, and resolves computed styles for each node. Supports media queries with responsive hint extraction.

## Implementation

**Engine:** [PostCSS](https://postcss.org/) — industry-standard CSS parser with excellent spec compliance.  
**File:** `packages/css-analyzer/index.ts`  
**Package:** `@html-native/css-analyzer`

## Exported Functions

### `parseCss(css: string): CssStylesheet`

Parses a CSS string into a structured stylesheet object.

**Parameters:**
- `css` — Raw CSS string. Empty or whitespace-only strings return an empty stylesheet.

**Returns:** `CssStylesheet` containing:
- `rules` — Array of `CssRule` objects (standard CSS rules)
- `mediaQueries` — Array of `CssMediaQuery` objects (@media blocks)

**Example:**
```typescript
import { parseCss } from '@html-native/css-analyzer';

const sheet = parseCss(`
  .card { padding: 16px; border-radius: 8px; }
  @media (min-width: 768px) { .card { padding: 24px; } }
`);
// sheet.rules.length === 1
// sheet.mediaQueries.length === 1
```

### `matchSelector(selector: string, node: HtmlNode): boolean`

Tests whether a CSS selector matches an HTML node.

**Parameters:**
- `selector` — CSS selector string (supports tag, `.class`, `#id`, `*`)
- `node` — HtmlNode to test against

**Returns:** `boolean`

**Supported selectors:**
| Pattern | Example | Matches |
|---------|---------|---------|
| Tag | `div` | Any `<div>` element |
| Class | `.card` | Elements with `class="card"` |
| ID | `#main` | Element with `id="main"` |
| Universal | `*` | Any element |

**Note:** Compound selectors (e.g., `div.card`, `.container > .card`) are not currently supported. Each selector string is matched as a single simple selector.

### `resolveStyles(node: HtmlNode, stylesheet: CssStylesheet): ResolvedStyles`

Computes the merged styles for a single node by iterating all matching rules. Later rules override earlier ones for the same property.

**Parameters:**
- `node` — HtmlNode to resolve styles for
- `stylesheet` — Parsed CssStylesheet

**Returns:** `ResolvedStyles` — a record of `{ [property: string]: string }`

**Example:**
```typescript
const styles = resolveStyles(buttonNode, sheet);
// styles['background'] === 'blue'
// styles['border-radius'] === '4px'
```

### `applyStyles(nodes: HtmlNode[], stylesheet: CssStylesheet): StyledNode[]`

Recursively applies styles to an HtmlNode tree, producing a StyledNode tree.

**Parameters:**
- `nodes` — Array of HtmlNodes (typically `ast.children`)
- `stylesheet` — Parsed CssStylesheet

**Returns:** `StyledNode[]` — each node has `.node`, `.styles`, and `.children`

### `extractResponsiveHints(stylesheet: CssStylesheet): ResponsiveHint[]`

Extracts responsive design hints from media queries.

**Parameters:**
- `stylesheet` — Parsed CssStylesheet

**Returns:** `ResponsiveHint[]` — each hint has a breakpoint, condition type (`min-width`, `max-width`, `min-height`, `max-height`), value, and associated styles.

**Note:** Responsive hints are parsed and available but not yet consumed by generators. This is a known gap documented in the [IR](ir.md) and [roadmap](roadmap.md).

## Core Types

```typescript
interface CssStylesheet {
  rules: CssRule[];
  mediaQueries: CssMediaQuery[];
}

interface CssRule {
  selectors: string[];        // e.g., ['.card'], ['h1', '.title']
  declarations: CssStyleDeclaration[];
  sourceLocation?: SourceLocation;
}

interface CssStyleDeclaration {
  property: string;            // e.g., 'padding', 'font-size'
  value: string;               // e.g., '16px', 'blue'
  important: boolean;          // true if !important
}

interface CssMediaQuery {
  condition: string;           // e.g., '(min-width: 768px)'
  rules: CssRule[];            // Rules inside the @media block
}

interface ResponsiveHint {
  breakpoint: string;          // e.g., 'min-width: 768px'
  condition: 'min-width' | 'max-width' | 'min-height' | 'max-height';
  value: string;               // e.g., '768px'
  styles: ResolvedStyles;      // Styles that apply at this breakpoint
}
```

## Supported CSS Properties

These properties are extracted from CSS and propagated to the IR:

| CSS Property | IR Key | Purpose |
|-------------|--------|---------|
| `padding` | `padding` | Spacing inside element |
| `margin` | `margin` | Spacing outside element |
| `gap` | `gap` | Flex/grid gap |
| `width` | `width` | Element width |
| `height` | `height` | Element height |
| `min-width` | `minWidth` | Minimum width |
| `max-width` | `maxWidth` | Maximum width |
| `font-size` | `fontSize` | Text size |
| `font-weight` | `fontWeight` | Text weight |
| `line-height` | `lineHeight` | Line height |
| `text-align` | `textAlign` | Text alignment |
| `color` | `color` | Text color |
| `background` | `background` | Background color/image |
| `border` | `border` | Border shorthand |
| `border-radius` | `borderRadius` | Corner rounding |
| `box-shadow` | `boxShadow` | Shadow effect |
| `display` | *(used for layout inference)* | Layout mode |
| `flex-direction` | *(used for layout inference)* | Flex direction |
| `position` | `position` | Positioning mode |

## Media Queries

PostCSS handles `@media` rules natively. The parser:

1. Identifies `@media` at-rules via `node.type === 'atrule'`
2. Extracts the condition from `node.params` (e.g., `(min-width: 768px)`)
3. Parses nested rules identically to top-level rules
4. Stores them separately in `stylesheet.mediaQueries[]`

Non-media at-rules (`@font-face`, `@keyframes`, `@import`) are ignored.

## Error Handling

Malformed CSS is caught by a try-catch wrapper around `postcss.parse()`. On failure, a warning is logged to the console and an empty stylesheet is returned. This ensures the pipeline continues even with partially broken CSS.

## Testing

18 tests cover:
- Basic rule parsing
- Class, tag, id, and universal selector matching
- Style resolution with multiple rules
- Vendor prefix handling
- `@import` graceful ignoring
- Empty/whitespace input
- Media query parsing (simple, multiple rules, complex conditions)
- Responsive hint extraction (min-width, max-width, empty)
