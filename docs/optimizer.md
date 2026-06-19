# Optimizer

## Purpose

Transforms the IR tree to reduce redundancy and simplify structure before code generation. The optimizer runs exactly once at the pipeline level — generators never call it internally.

## Implementation

**File:** `packages/optimizer/index.ts`  
**Package:** `@html-native/optimizer`

## Exported Functions

### `optimize(ir: UiNode, passes?: OptimizationPass[]): UiNode`

Runs a sequence of optimization passes on the IR tree.

**Parameters:**
- `ir` — Root UiNode to optimize
- `passes` — Array of optimization passes (defaults to `defaultPasses`)

**Returns:** Optimized UiNode tree (new object, original is not mutated)

### `defaultPasses: OptimizationPass[]`

The default set of passes, applied in order:

1. `removeEmptyText`
2. `mergeTextNodes`
3. `flattenContainers`

## Default Passes

### 1. removeEmptyText

**Purpose:** Removes text nodes with no content or whitespace-only content.  
**Strategy:** Recursive depth-first traversal, filtering children where `type === 'Text'` and value is empty or whitespace.  
**Why:** Empty text nodes occur when the HTML parser encounters whitespace between elements. They would generate unnecessary `Text("")` in the output.

### 2. mergeTextNodes

**Purpose:** Merges adjacent text nodes into a single text node.  
**Strategy:** After removing empty text, consecutive `Text` nodes at the same level are merged by concatenating their values with a space separator.  
**Why:** HTML like `<p>Hello <!-- comment --> World</p>` can produce adjacent text nodes. Merging them produces a single `Text("Hello World")`.

### 3. flattenContainers

**Purpose:** Removes container nodes that wrap a single child with no additional properties.  
**Strategy:** If a node's type is `Container` or `Unknown`, it has exactly one child, and its `properties` object is empty, replace it with its child.  
**Why:** HTML often has unnecessary wrapper divs. Flattening them produces cleaner generated code.

## Custom Passes

The optimizer supports custom pass arrays via the `passes` parameter:

```typescript
import { optimize, OptimizationPass } from '@html-native/optimizer';

const myPass: OptimizationPass = {
  name: 'customPass',
  run: (node: UiNode) => {
    // Custom transformation logic
    return transformedNode;
  },
};

const result = optimize(myIr, [
  ...defaultPasses,
  myPass,
]);
```

## Design Decisions

### Why Single-Point Optimization?

Previous versions had each generator calling `optimize()` internally, leading to double-optimization bugs and inconsistent behavior. Moving optimization to exactly one call site (CLI or `runPipeline()`) eliminated the issue. All generators now expect pre-optimized IR.

### Why Functional (Non-Mutating)?

Each pass creates new nodes rather than mutating in place. This ensures:
- No unexpected side effects between passes
- Easy debugging (each pass can be inspected independently)
- Thread safety (not currently relevant for synchronous usage, but good practice)

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Single empty text node | Removed by removeEmptyText |
| Multiple adjacent text nodes | Merged by mergeTextNodes |
| Container with 1 child + properties | Not flattened (properties would be lost) |
| Container with 1 child, no properties | Flattened (replaced by child) |
| Container with 2+ children | Not flattened (would change layout) |
| No changes needed | Returns equivalent tree (new objects) |
