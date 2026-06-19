# Flutter Generator

## Purpose

Generates Dart code using Flutter's Material Design widget library. Output is a `StatelessWidget` subclass with `import 'package:flutter/material.dart'`.

## Implementation

**File:** `packages/generators/flutter/index.ts`  
**Package:** `@html-native/generator-flutter`

## Exported Function

### `generate(node: UiNode, name?: string): GenerateResult`

**Parameters:**
- `node` — Optimized UiNode tree
- `name` — Widget class name (default: `GeneratedView`)

**Returns:** `GenerateResult` with:
- `code` — Complete Dart source file
- `metadata.platform` — `'flutter'`
- `metadata.nodes` — Number of IR nodes
- `metadata.duration` — Generation time in ms

## Boilerplate

```dart
import 'package:flutter/material.dart';

class GeneratedView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return /* generated widget tree */;
  }
}
```

## Widget Mapping

| IR Type | Flutter Widget |
|---------|---------------|
| `Text` | `Text("...")` |
| `Button` | `ElevatedButton(onPressed: () {}, child: Text("..."))` |
| `Row` | `Row(children: [...])` |
| `Column` | `Column(children: [...])` |
| `Container` | `Container(child: ...)` |
| `Card` | `Card(child: ...)` |
| `Image` | `Image.network("...")` |
| `TextField` | `TextField(decoration: InputDecoration(...))` |
| `AppBar` | `AppBar(title: Text("..."))` |
| `ScrollView` / `ListView` | `ListView(children: [...])` |
| `Form` | `Form(child: Column(...))` |
| `Footer` | `Container(child: Column(...))` |
| Default (with text) | `Text("...")` |
| Default (with children) | `Column(children: [...])` |
| Default (empty) | `SizedBox.shrink()` |

## Property Handling

CSS properties from the IR are emitted as Flutter widget constructor parameters. Property names are used directly (camelCase, matching Flutter conventions). Values are:

- Pixel values (`16px`) → numeric (`16`)
- Numeric strings (`24`) → numeric (`24`)
- All other values → string literals (`"blue"`, `"#333"`)

**Limitation:** CSS-to-Flutter value mapping is basic. Colors, padding, and other complex values are emitted as strings rather than Flutter expressions (`Colors.blue`, `EdgeInsets.all(16)`). This is a known area for future improvement.

## Examples

### Card with heading

**HTML:** `<div class="card"><h2>Hello</h2><p>World</p></div>`
**CSS:** `.card { padding: 16px; border-radius: 8px; }`

**Generated Flutter:**
```dart
import 'package:flutter/material.dart';

class GeneratedView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          Text("Hello"),
          Text("World"),
        ],
      ),
    );
  }
}
```

### Navigation bar

**HTML:** `<nav class="navbar"><h1>My App</h1></nav>`

**Generated Flutter:**
```dart
class GeneratedView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return AppBar(
      title: Text("My App"),
    );
  }
}
```

## Design Notes

- Dart uses `$` for string interpolation, so any `$` in text content is escaped to `\$`
- `ElevatedButton` wraps text labels in a `Text` widget when no non-text children exist
- Multiple children in a `Container` are wrapped in a `Column` automatically
