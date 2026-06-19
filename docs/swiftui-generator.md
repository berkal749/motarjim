# SwiftUI Generator

## Purpose

Generates Swift code using SwiftUI (iOS 17+). Output is a `struct` conforming to the `View` protocol with `import SwiftUI`.

## Implementation

**File:** `packages/generators/swiftui/index.ts`  
**Package:** `@html-native/generator-swiftui`

## Exported Function

### `generate(node: UiNode, name?: string): GenerateResult`

**Parameters:**
- `node` — Optimized UiNode tree
- `name` — View struct name (default: `GeneratedView`)

**Returns:** `GenerateResult` with:
- `code` — Complete Swift source file
- `metadata.platform` — `'swiftui'`
- `metadata.nodes` — Number of IR nodes
- `metadata.duration` — Generation time in ms

## Boilerplate

```swift
import SwiftUI

struct GeneratedView: View {
    var body: some View {
        /* generated view tree */
    }
}
```

## Widget Mapping

| IR Type | SwiftUI View |
|---------|-------------|
| `Text` | `Text("...")` |
| `Button` | `Button("...") { /* action */ }` |
| `Row` | `HStack { ... }` |
| `Column` | `VStack { ... }` |
| `Container` | `VStack { ... }` or `Color.clear` |
| `Card` | `VStack { ... }.background(Color(.systemBackground)).cornerRadius(12).shadow(radius: 4)` |
| `Image` | `Image("...").resizable().aspectRatio(contentMode: .fit)` |
| `TextField` | `TextField("Input", text: .constant("")).textFieldStyle(.roundedBorder)` |
| `AppBar` | `.navigationTitle("...")` |
| `ScrollView` | `ScrollView { LazyVStack { ... } }` |
| `Form` | `Form { ... }` |
| `Footer` | `VStack { ... }` or `Spacer()` |
| Default (with text) | `Text("...")` |
| Default (with children) | `VStack { ... }` |
| Default (empty) | `Spacer()` |

## Navigation Title

`.navigationTitle(...)` is emitted as a view modifier when an `AppBar` or `NavigationBar` is detected. This modifier requires a parent `NavigationStack` or `NavigationView` to take effect. The generated code does not automatically wrap the tree in a `NavigationStack` — add it manually if needed:

```swift
NavigationStack {
    GeneratedView()
}
```

## Examples

### Card with heading

**Generated SwiftUI:**
```swift
import SwiftUI

struct GeneratedView: View {
    var body: some View {
        VStack {
            Text("Hello")
            Text("World")
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 4)
    }
}
```

### Form with text fields

**Generated SwiftUI:**
```swift
struct GeneratedView: View {
    var body: some View {
        Form {
            TextField("Input", text: .constant(""))
                .textFieldStyle(.roundedBorder)
            TextField("Input", text: .constant(""))
                .textFieldStyle(.roundedBorder)
            Button("Send") {
                // action
            }
        }
    }
}
```

### Navigation bar

**Generated SwiftUI:**
```swift
struct GeneratedView: View {
    var body: some View {
        Text("My App")
            .navigationTitle("My App")
    }
}
```

## Design Notes

- SwiftUI uses `VStack` and `HStack` for layout (equivalent to Flutter's `Column`/`Row`)
- Cards are styled with standard SwiftUI modifiers (`background`, `cornerRadius`, `shadow`)
- `ScrollView` wraps content in `LazyVStack` for efficient scrolling
- Text fields use `TextField` with `.roundedBorder` style and `.constant("")` binding as a placeholder
- The generator targets iOS 17+ SwiftUI API conventions
