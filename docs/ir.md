# Intermediate Representation (IR)

## Purpose

The IR (Intermediate Representation) is a platform-neutral tree that bridges CSS-styled HTML nodes and platform-specific code generation. Every generator takes an IR tree as input — they never see raw HTML or CSS.

## Implementation

**File:** `packages/ir/index.ts`  
**Package:** `@html-native/ir`

## Exported Functions

### `styledNodeToIr(styled: StyledNode, hints?: SemanticHint[]): UiNode`

Converts a styled HTML node tree to the platform-neutral IR.

**Parameters:**
- `styled` — Root StyledNode (from `applyStyles()`)
- `hints` — Optional SemanticHint array (from `detectSemantics()`). When provided, hints with confidence > 0.5 override inferred types.

**Returns:** A `UiNode` tree

**Example:**
```typescript
import { styledNodeToIr } from '@html-native/ir';

const ir = styledNodeToIr(rootStyled, hints);
// ir.type === 'Column' (or inferred from display: flex)
// ir.children[0].type === 'Text'
```

### `createIrNode(type, properties?, children?, value?): UiNode`

Factory function for creating IR nodes. Used internally and available for custom passes.

## Core Types

```typescript
interface UiNode {
  type: UiNodeType;
  properties: Record<string, unknown>;  // Platform-neutral style properties
  children: UiNode[];
  styles?: ResolvedStyles;               // Original CSS styles (optional, for reference)
  sourceHtmlTag?: string;                // Original HTML tag
  value?: string;                        // Text content
}
```

### UiNodeType

38 possible types, grouped by category:

| Category | Types |
|----------|-------|
| Layout | `Container`, `Row`, `Column`, `Stack`, `Grid`, `Spacer`, `Divider`, `Section`, `Article` |
| Navigation | `NavigationBar`, `AppBar`, `Drawer`, `Sidebar`, `Nav`, `Header`, `Link` |
| Content | `Text`, `Image`, `Icon`, `Svg`, `Card`, `HeroSection`, `Footer` |
| Form | `Form`, `Button`, `TextField`, `TextArea` |
| List | `List`, `UnorderedList`, `OrderedList`, `ListItem` |
| Scrolling | `ScrollView`, `LazyList`, `ListView` |
| Overlay | `Dialog`, `Modal`, `Tabs` |
| Other | `Unknown` |

## Type Inference

When no semantic hint applies (or confidence ≤ 0.5), the IR infers the type from:

1. **Tag name mapping** — explicit table for common tags:
   - `h1`-`h6` → `Text`
   - `button` → `Button`
   - `img` → `Image`
   - `input` → `TextField`
   - `form` → `Form`
   - `nav` → `Nav`
   - `footer` → `Footer`
   - `section` → `Section`

2. **CSS display property** — for `div`/`span` and other generic tags:
   - `display: flex` + `flex-direction: column` → `Column`
   - `display: flex` + `flex-direction: row` → `Row`
   - `display: grid` → `Grid`
   - Otherwise → `Container`

## Property Extraction

CSS properties are extracted from `StyledNode.styles` and converted to camelCase:

| CSS Property | IR Property |
|-------------|-------------|
| `font-size` | `fontSize` |
| `border-radius` | `borderRadius` |
| `min-width` | `minWidth` |
| `max-width` | `maxWidth` |
| `font-weight` | `fontWeight` |
| `line-height` | `lineHeight` |
| `text-align` | `textAlign` |
| `box-shadow` | `boxShadow` |

HTML attributes `src`, `alt`, `href`, and `value` are also extracted.

## Text Propagation

For text-like elements (`h1`-`h6`, `p`, `span`, `a`, `label`), text content from child `#text` nodes is absorbed into the node's `value` field. This simplifies downstream handling — generators can read `node.value` directly instead of traversing child text nodes.

## Responsive Hints

`ResponsiveHint` objects from `extractResponsiveHints()` are parsed and available in the data model but are not yet propagated into the `UiNode` tree. This is a known gap — generators currently see only the default (non-media-query) styles.

## Design Decisions

### Why Not Just Pass Raw HTML/CSS to Generators?

Generators should never parse or interpret HTML/CSS directly. The IR:

- Normalizes CSS properties to a common format
- Resolves type inference once (not per-generator)
- Strips HTML-specific concerns (DOCTYPE, head, etc.)
- Provides a stable API that doesn't change when the HTML parser or CSS analyzer changes

### Why CamelCase Property Names?

CSS properties arrive in kebab-case (`font-size`). Converting to camelCase in the IR makes them natural for all target platforms — Flutter uses camelCase widget properties, and both Kotlin and Swift use camelCase identifiers.
