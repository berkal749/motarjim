# Generator Core

## Purpose

The shared infrastructure that all three platform generators depend on. Contains the traversal dispatcher, `NodeEmitter` interface, and formatting utilities.

## Implementation

**File:** `packages/generator-core/index.ts`  
**Package:** `@html-native/generator-core`

## Exported Functions

### `walkTree(node: UiNode, emitter: NodeEmitter, level?: number): string`

The central traversal function. Recursively walks the IR tree and dispatches to the appropriate emitter method based on node type.

**Parameters:**
- `node` — The UiNode to generate code for
- `emitter` — A platform-specific `NodeEmitter` implementation
- `level` — Current indentation level (default: 0)

**Returns:** Generated code string for the node and its children

**Dispatcher logic:**
- `Text` → `emitter.emitText()`
- `Button` → extracts label from child text, renders non-text children, calls `emitter.emitButton()`
- `Row` → `emitter.emitRow()`
- `Column` → `emitter.emitColumn()`
- `Container` → `emitter.emitContainer()`
- `NavigationBar` / `AppBar` → extracts title from child text, calls `emitter.emitAppBar()`
- `Card` → `emitter.emitCard()`
- `Image` → `emitter.emitImage()`
- `TextField` → `emitter.emitTextField()`
- `ListView` / `LazyList` / `ScrollView` → `emitter.emitScrollView()`
- `Form` → `emitter.emitForm()`
- `Footer` → `emitter.emitFooter()`
- Everything else → `emitter.emitDefault()`

### `countNodes(node: UiNode): number`

Recursively counts all nodes in a UiNode tree.

**Parameters:**
- `node` — Root UiNode

**Returns:** Total node count (including root)

### `escapeString(s: string): string`

Escapes special characters for string literals.

**Escapes:** backslash (`\`), double quote (`"`), newline (`\n`)

### `escapeStringExtra(s: string, extra: Record<string, string>): string`

Extends `escapeString` with platform-specific escape sequences.

**Parameters:**
- `s` — String to escape
- `extra` — Map of characters to their escape sequences

**Example:**
```typescript
// Dart string interpolation requires $ escaping
escapeStringExtra(text, { '$': '\\$' });
```

### `findTextLabel(node: UiNode): string`

Finds the first text child of a node and returns its value.

**Parameters:**
- `node` — UiNode to search

**Returns:** String value of first text child, or empty string

**Used by:** Button, AppBar label extraction

### `getNonTextChildren(node: UiNode): UiNode[]`

Filters out text children, returning only structural children.

**Parameters:**
- `node` — UiNode to filter

**Returns:** Array of non-text child nodes

## Core Types

### `NodeEmitter` Interface

The contract each platform generator must implement:

```typescript
interface NodeEmitter {
  indentUnit: string;

  emitText(node: UiNode, indent: string): string;
  emitButton(indent: string, label: string, children: string[]): string;
  emitRow(indent: string, children: string[]): string;
  emitColumn(indent: string, children: string[]): string;
  emitContainer(node: UiNode, indent: string, children: string[]): string;
  emitCard(indent: string, children: string[]): string;
  emitImage(node: UiNode, indent: string): string;
  emitTextField(indent: string): string;
  emitAppBar(indent: string, title: string): string;
  emitScrollView(indent: string, children: string[]): string;
  emitForm(indent: string, children: string[]): string;
  emitFooter(indent: string, children: string[]): string;
  emitDefault(node: UiNode, indent: string, children: string[]): string;
}
```

Each method receives:
- `indent` — The current indentation string (built from `indentUnit` repeated)
- Platform-specific parameters (label, title, children arrays)
- `node` for methods that need access to properties

## Design Decisions

### What Goes in Generator-Core vs. Stays Platform-Specific

**Shared (in generator-core):**
- Tree traversal and type dispatch (`walkTree()`)
- Text/content extraction (`findTextLabel()`, `getNonTextChildren()`)
- Escaping utilities (`escapeString()`, `escapeStringExtra()`)
- Node counting (`countNodes()`)
- The `NodeEmitter` interface contract

**Platform-specific (in each generator):**
- All syntax generation (each `emit*` method is completely different per platform)
- Property formatting (CSS values map differently per platform)
- Boilerplate wrapping (imports, class/struct declaration)
- Indentation units (2 spaces for Dart, 4 for Kotlin/Swift)

### Why Not a Shared Abstract Class?

The `NodeEmitter` interface is deliberately minimal — it's a contract, not a base class. Platform implementations share no method bodies. An abstract class with default implementations would either be empty (useless) or wrong (forcing incorrect defaults on platforms where they don't apply).
