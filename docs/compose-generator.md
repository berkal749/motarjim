# Compose Generator

## Purpose

Generates Kotlin code using Jetpack Compose with Material 3 design. Output is a `@Composable` function with Material3 imports.

## Implementation

**File:** `packages/generators/compose/index.ts`  
**Package:** `@html-native/generator-compose`

## Exported Function

### `generate(node: UiNode, name?: string): GenerateResult`

**Parameters:**
- `node` — Optimized UiNode tree
- `name` — Composable function name (default: `GeneratedView`)

**Returns:** `GenerateResult` with:
- `code` — Complete Kotlin source file
- `metadata.platform` — `'compose'`
- `metadata.nodes` — Number of IR nodes
- `metadata.duration` — Generation time in ms

## Boilerplate

```kotlin
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier

@Composable
fun GeneratedView() {
    /* generated composable tree */
}
```

## Widget Mapping

| IR Type | Compose Widget |
|---------|---------------|
| `Text` | `Text(text = "...")` |
| `Button` | `Button(onClick = { }) { Text(text = "...") }` |
| `Row` | `Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { ... }` |
| `Column` | `Column { ... }` |
| `Container` | `Box(modifier = Modifier) { ... }` |
| `Card` | `Card(modifier = Modifier) { ... }` |
| `Image` | `Image(painter = painterResource(...), contentDescription = "...")` |
| `TextField` | `OutlinedTextField(value = "", onValueChange = { }, label = { Text("Input") })` |
| `AppBar` | `TopAppBar(title = { Text("...") })` |
| `ScrollView` | `LazyColumn { ... }` |
| `Form` | `Column { ... }` |
| `Footer` | `Column { ... }` |
| Default (with text) | `Text(text = "...")` |
| Default (with children) | `Column { ... }` |
| Default (empty) | `Spacer(modifier = Modifier.size(0.dp))` |

## Image Handling

**Known Limitation:** The current image emitter uses `painterResource(id = R.drawable.${src})`, which assumes local Android drawable resources. HTML `<img src="...">` values with URLs or relative paths will not compile directly. 

Workarounds:
- Use Android drawable resource names in `src` (e.g., `src="ic_launcher"`)
- Replace the generated `painterResource` call with Coil's `AsyncImage(model = "...")` for network images

## Examples

### Card with heading

**Generated Compose:**
```kotlin
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier

@Composable
fun GeneratedView() {
    Card(
        modifier = Modifier
    ) {
        Column {
            Text(text = "Hello")
            Text(text = "World")
        }
    }
}
```

### Button with text

**Generated Compose:**
```kotlin
@Composable
fun GeneratedView() {
    Button(
        onClick = { }
    ) {
        Text(text = "Get Started")
    }
}
```

## Design Notes

- Compose uses trailing lambda syntax for `children` blocks
- `LazyColumn` is used for scroll views (efficient for large lists)
- Material 3 components are used throughout (`OutlinedTextField`, `TopAppBar`, `Card`)
- The `Modifier` parameter is included on all layout components for extensibility
