# CLI Reference

## Overview

`html-native` is the command-line interface for the compiler pipeline. It accepts HTML and optional CSS input and generates native UI code for the specified platform.

## Installation

```bash
# From npm (when published)
npm install -g html-native-engine

# From source
git clone <repo>
cd html-native-engine
npm install
npm run build
```

## Command: `convert`

Converts HTML/CSS to native UI code.

### Usage

```bash
html-native convert --input <file> --target <platform> [options]
```

### Options

| Option | Alias | Required | Description |
|--------|-------|----------|-------------|
| `--input <path>` | `-i` | Yes | Path to input HTML file |
| `--css <path>` | `-c` | No | Path to input CSS file |
| `--target <platform>` | `-t` | Yes | Target platform: `flutter`, `compose`, or `swiftui` |
| `--output <path>` | `-o` | No | Output file path (prints to stdout if omitted) |
| `--ai-enhance` | | No | Enable Ollama AI-enhanced semantic detection |
| `--ai-model <model>` | | No | Ollama model name (default: `qwen2.5:7b`) |

### Examples

#### Basic Conversion

```bash
# Convert to Flutter, output to file
html-native convert \
  --input index.html \
  --css styles.css \
  --target flutter \
  --output lib/generated.dart

# Convert to Compose, print to stdout
html-native convert \
  --input index.html \
  --css styles.css \
  --target compose

# Convert to SwiftUI with AI enhancement
html-native convert \
  --input index.html \
  --css styles.css \
  --target swiftui \
  --output GeneratedView.swift \
  --ai-enhance
```

#### Platform-Specific

<details>
<summary><b>Flutter</b></summary>

```bash
html-native convert \
  --input page.html \
  --css page.css \
  --target flutter \
  --output lib/widgets/generated_page.dart
```

Generates a Dart file with:
```dart
import 'package:flutter/material.dart';

class GeneratedView extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // ...
  }
}
```
</details>

<details>
<summary><b>Compose</b></summary>

```bash
html-native convert \
  --input page.html \
  --css page.css \
  --target compose \
  --output app/src/main/java/com/example/GeneratedView.kt
```

Generates a Kotlin file with:
```kotlin
import androidx.compose.material3.*

@Composable
fun GeneratedView() {
    // ...
}
```
</details>

<details>
<summary><b>SwiftUI</b></summary>

```bash
html-native convert \
  --input page.html \
  --css page.css \
  --target swiftui \
  --output GeneratedView.swift
```

Generates a Swift file with:
```swift
import SwiftUI

struct GeneratedView: View {
    var body: some View {
        // ...
    }
}
```
</details>

#### CI/CD Integration

```yaml
# GitHub Actions example
jobs:
  generate-ui:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g html-native-engine
      - run: |
          html-native convert \
            --input design/index.html \
            --css design/styles.css \
            --target flutter \
            --output lib/generated/home_page.dart
      - run: flutter build
```

#### Shell Scripting

```bash
#!/bin/bash
# Batch convert all HTML files in a directory

for file in designs/*.html; do
  name=$(basename "$file" .html)
  css="designs/${name}.css"
  
  if [ -f "$css" ]; then
    html-native convert \
      --input "$file" \
      --css "$css" \
      --target flutter \
      --output "lib/generated/${name}_page.dart"
  else
    html-native convert \
      --input "$file" \
      --target flutter \
      --output "lib/generated/${name}_page.dart"
  fi
done
```

#### Automation

```bash
# Watch mode (using entr)
find designs/ -name '*.html' -o -name '*.css' | entr -c html-native convert \
  --input designs/index.html \
  --css designs/styles.css \
  --target flutter \
  --output lib/generated.dart
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (file not found, parse failure, unknown target) |

## Error Messages

| Error | Cause |
|-------|-------|
| `File not found: path` | Input file doesn't exist |
| `CSS file not found: path` | CSS file doesn't exist |
| `Unknown target "..."` | Target must be `flutter`, `compose`, or `swiftui` |
| `Error during conversion: ...` | Pipeline error with details |
