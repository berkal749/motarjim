# Pipeline

## Overview

The compilation pipeline is the heart of html-native-engine. Each stage transforms the input and passes it to the next. The pipeline is fully synchronous and runs entirely in-process.

## Stage Diagram

```
┌──────────┐    ┌──────────────┐    ┌──────────────────┐
│  parse5  │───▶│   PostCSS    │───▶│ Semantic Detector │
└──────────┘    └──────────────┘    └──────────────────┘
     │                │                      │
     ▼                ▼                      ▼
 HtmlNode      CssStylesheet          SemanticHint[]
     │                │                      │
     └────────────────┴──────────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ resolveStyles│──▶ StyledNode[]
              └──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │styledNodeToIr│──▶ UiNode
              └──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │   optimize   │──▶ UiNode (optimized)
              └──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │  walkTree()  │──▶ Platform code
              └──────────────┘
```

## Pipeline Functions

### `runPipeline(html, css?)` — Integration Test Helper

Located in `tests/generators.test.ts`, this function wires the full pipeline:

```
parseHtml(html) → parseCss(css) → applyStyles(ast.children, sheet)
→ detectSemantics(styled) → styledNodeToIr(root, hints) → optimize(ir)
```

Returns the optimized `UiNode` tree, ready for any generator.

### CLI Pipeline

The CLI (`packages/cli/index.ts`) follows the same pipeline:

```
readFileSync(input) → parseHtml(html) → parseCss(css)
→ applyStyles(ast.children, stylesheet)
→ detectSemantics(styledNodes) or createAiDetector()(styledNodes)
→ styledNodeToIr(rootStyled, hints) → optimize(ir) → generate*(optimized)
```

## Stage Details

### Stage 1: HTML Parsing

**Input:** Raw HTML string  
**Output:** `HtmlNode` tree  
**Engine:** parse5  
**Function:** `parseHtml(html)`  
**Fragment variant:** `parseFragment(html)`  

Parses the HTML document and extracts `<body>` contents. Text nodes are stored with their content in `HtmlNode.value`. Only elements inside `<body>` are returned — `<head>`, doctype, and outer `<html>` wrapper are stripped.

### Stage 2: CSS Parsing

**Input:** Raw CSS string  
**Output:** `CssStylesheet` (rules + mediaQueries)  
**Engine:** PostCSS  
**Function:** `parseCss(css)`  

Handles standard rules, `@media` blocks, vendor prefixes, and `@import`. Non-media at-rules (`@font-face`, `@keyframes`) are ignored gracefully. Malformed CSS returns an empty stylesheet with a console warning.

### Stage 3: Style Application

**Input:** `HtmlNode[]` + `CssStylesheet`  
**Output:** `StyledNode[]`  
**Function:** `applyStyles(nodes, stylesheet)`  

Recursively walks the HTML tree, matching each node against CSS rules using `matchSelector()`, and attaching resolved styles. Selector types supported: tag name, class, id, universal (`*`).

### Stage 4: Semantic Analysis

**Input:** `StyledNode[]`  
**Output:** `SemanticHint[]`  
**Function:** `detectSemantics(styledNodes)`  

Rule-based detection of UI components:
- Navigation bars (nav tag, .navbar class)
- Cards (.card class, shadow + rounded corners)
- Hero sections (.hero class)
- Modals/dialogs
- App bars
- Sidebars
- Footers
- Tabs
- Forms

Optional AI enhancement via Ollama (see [AI Enhancement](ai-enhancement.md)).

### Stage 5: IR Conversion

**Input:** `StyledNode` + `SemanticHint[]`  
**Output:** `UiNode` tree  
**Function:** `styledNodeToIr(styled, hints)`  

Converts styled HTML nodes to platform-neutral IR nodes. CSS properties are extracted and normalized to camelCase. Semantic hints override inferred types when confidence > 0.5. Text content in heading/paragraph/span elements is absorbed from child text nodes.

### Stage 6: Optimization

**Input:** `UiNode` tree  
**Output:** `UiNode` tree (optimized)  
**Function:** `optimize(ir, passes?)`  

Default passes:
1. `removeEmptyText` — deletes empty text nodes
2. `mergeTextNodes` — merges adjacent text nodes
3. `flattenContainers` — removes single-child containers with no properties

Custom pass arrays can be provided for specialized optimization needs.

### Stage 7: Code Generation

**Input:** `UiNode` tree  
**Output:** Platform source code string + metadata  
**Functions:** `generateFlutter(ir)`, `generateCompose(ir)`, `generateSwiftUI(ir)`  

Each generator implements the `NodeEmitter` interface from `generator-core`. The `walkTree()` function traverses the IR tree and dispatches to emitter methods. The result is wrapped in platform boilerplate (StatelessWidget, @Composable function, or View struct).

## Error Handling

The pipeline handles errors at each stage:

| Stage | Error Strategy |
|-------|---------------|
| HTML parsing | parse5 is resilient; returns empty tree on major failures |
| CSS parsing | PostCSS wrapped in try-catch; returns empty stylesheet on failure |
| Style application | Silent skip for unmatched selectors |
| Semantic analysis | Returns empty hints array on failure |
| IR conversion | Falls back to inferred types when hints are missing |
| Optimization | Safe by construction — functional transformations |
| Code generation | Each emitter handles missing data with sensible defaults |
