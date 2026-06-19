# Parser

## Purpose

Converts raw HTML strings into a typed `HtmlNode` abstract syntax tree (AST) for downstream processing.

## Implementation

**Engine:** [parse5](https://github.com/inikulin/parse5) — the same HTML parser used by jsdom, compliant with the HTML spec.  
**File:** `packages/parser/index.ts`  
**Package:** `@html-native/parser`

## Exported Functions

### `parseHtml(html: string): HtmlNode`

Parses a full HTML document and returns the `<body>` contents as an `HtmlNode` tree.

**Parameters:**
- `html` — Raw HTML string. May include `<!DOCTYPE>`, `<html>`, `<head>`, and `<body>`.

**Returns:** An `HtmlNode` with:
- `nodeId: 'root'` — root container
- `tagName: 'root'` — synthetic root
- `children` — array of top-level `<body>` children

**Example:**
```typescript
import { parseHtml } from '@html-native/parser';

const ast = parseHtml('<div class="container"><h1>Hello</h1></div>');
// Returns:
// {
//   nodeId: 'root',
//   tagName: 'root',
//   attributes: [],
//   children: [{
//     nodeId: 'node_1',
//     tagName: 'div',
//     attributes: [{ name: 'class', value: 'container' }],
//     children: [{
//       nodeId: 'node_2',
//       tagName: 'h1',
//       attributes: [],
//       children: [{
//         nodeId: 'node_3',
//         tagName: '#text',
//         attributes: [],
//         children: [],
//         value: 'Hello'
//       }]
//     }]
//   }]
// }
```

### `parseFragment(html: string): HtmlNode[]`

Parses an HTML fragment (not a full document) and returns an array of top-level nodes.

**Parameters:**
- `html` — HTML fragment string. No `<body>` or `<html>` wrapper needed.

**Returns:** `HtmlNode[]` — array of parsed nodes.

**Example:**
```typescript
import { parseFragment } from '@html-native/parser';

const nodes = parseFragment('<p>Para 1</p><p>Para 2</p>');
// Returns two HtmlNode elements
```

## Core Types

```typescript
interface HtmlNode {
  nodeId: string;              // Unique identifier (e.g., 'node_42')
  tagName: string;             // Lowercase tag name (div, h1, #text, etc.)
  attributes: HtmlAttribute[]; // Parsed attributes
  children: HtmlNode[];        // Child nodes
  value?: string;              // Text content for #text nodes
  sourceLocation?: SourceLocation; // Parse5 source location
}

interface HtmlAttribute {
  name: string;
  value: string;
}

interface SourceLocation {
  line: number;
  col: number;
}
```

## Design Details

### Text Node Handling

Text content is stored in `HtmlNode.value` on nodes with `tagName: '#text'`. This is a deliberate design choice over storing text as an attribute, ensuring clean propagation through the IR.

Whitespace-only text nodes between elements are stripped during parsing — only non-empty text content produces `#text` nodes.

### Node ID Assignment

Each parsed node receives a unique incrementing ID (`node_1`, `node_2`, ...). The counter resets on each `parseHtml()` or `parseFragment()` call.

### Supported Tags

The parser accepts any HTML tag. The downstream semantic analyzer and generators handle specific tags:

| Category | Tags |
|----------|------|
| Layout | `div`, `span`, `section`, `article`, `header`, `footer`, `nav` |
| Text | `h1`-`h6`, `p`, `a` |
| Form | `form`, `input`, `textarea`, `button` |
| List | `ul`, `ol`, `li` |
| Media | `img`, `svg` |

### Edge Cases

| Input | Behavior |
|-------|----------|
| Empty string | Returns root node with no children |
| Whitespace only | Returns root node with no children |
| No `<body>` | Returns root node with no children |
| Self-closing tags | `<img>`, `<input>` — parsed without children |
| Malformed HTML | parse5's built-in resilience handles most cases |
| Deep nesting | Handled recursively (tested with 1000+ node trees) |

## Error Handling

parse5 is highly resilient to malformed HTML. In the unlikely event of a catastrophic failure, an empty root node is returned. The parser does not throw.
