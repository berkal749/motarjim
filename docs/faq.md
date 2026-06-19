# FAQ

## General

### What is html-native-engine?

A local-first compiler that converts HTML and CSS into native UI code for Flutter (Dart), Jetpack Compose (Kotlin), and SwiftUI (Swift). You write your UI in HTML/CSS and get platform-native source files.

### Is this a runtime or framework?

No. It's a **code generator**. It produces static source files that you compile with the standard platform toolchain (Flutter SDK, Android Studio, Xcode). There is no runtime library to include.

### Does this run in the cloud?

No. Everything runs locally on your machine. HTML and CSS are processed in-process with no network requests (except the optional Ollama AI enhancement, which also runs locally).

### Is this production-ready?

The compiler pipeline is functional and tested (71 tests, 12 snapshots). The generated code is syntactically valid but may need manual adjustments for complex styling (see [Limitations](#limitations)).

## Technical

### How does the compiler work?

Follows a classic multi-stage architecture: Parser → CSS Analyzer → Semantic Analyzer → IR → Optimizer → Code Generator. See [architecture.md](architecture.md) for details.

### What HTML features are supported?

Standard HTML elements: `div`, `span`, `p`, `h1`-`h6`, `button`, `img`, `input`, `textarea`, `form`, `ul`, `ol`, `li`, `section`, `article`, `header`, `footer`, `nav`, `a`. Text nodes with non-whitespace content are preserved.

### What CSS features are supported?

| Feature | Status |
|---------|--------|
| Tag selectors | ✓ |
| Class selectors | ✓ |
| ID selectors | ✓ |
| Universal selector | ✓ |
| Compound selectors | ✗ (div.class, .a > .b) |
| Pseudo-selectors | ✗ (:hover, :nth-child) |
| Media queries | ✓ (parsed, not yet consumed by generators) |
| Vendor prefixes | ✓ |
| `@import` | ✓ (ignored gracefully) |

### What CSS properties are supported?

Layout: `display`, `flex-direction`, `padding`, `margin`, `gap`, `position`  
Sizing: `width`, `height`, `min-width`, `max-width`  
Typography: `font-size`, `font-weight`, `line-height`, `text-align`  
Colors: `color`, `background`  
Effects: `border`, `border-radius`, `box-shadow`

### Does the output look exactly like the HTML/CSS design?

Not pixel-perfectly. CSS is a rich layout language with decades of browser evolution. Native UI frameworks have different primitives and capabilities. The output is **functionally equivalent** — same structure, same text, same approximate styling — but not pixel-identical.

### Can I use this with any HTML/CSS framework?

Yes, as long as the output is standard HTML/CSS. Frameworks like Tailwind CSS, Bootstrap, or vanilla HTML/CSS all work — the compiler only sees the rendered HTML structure and CSS rules.

## Platforms

### Which Flutter version is required?

The generated code targets standard Flutter with Material Design. No specific version requirements beyond having the `material` package.

### Which Compose version is required?

The generated code uses Material 3 components (`androidx.compose.material3.*`). Requires at least Compose BOM 2023.01.00 or later.

### Which SwiftUI version is required?

The generated code targets iOS 17+ SwiftUI APIs.

### Can I add support for another platform?

Yes. Implement the `NodeEmitter` interface from `generator-core`, add a `generate()` function, and add a CLI target option. See [architecture.md](architecture.md#extension-points) for details.

## AI Enhancement

### Does the AI mode send my code to a remote server?

No. Ollama runs locally on your machine. The HTML/CSS never leaves your computer.

### Do I need Ollama to use the compiler?

No. The AI enhancement is entirely optional. Without `--ai-enhance`, the compiler uses rule-based detection exclusively, which is faster and requires no external dependencies.

### Which Ollama models are supported?

Any model that responds well to structured JSON prompts. The default is `qwen2.5:7b`. Smaller models like `llama3.2:3b` are faster but may produce lower-quality results.

## Performance

### How fast is it?

~100ms for 1000 HTML nodes on a standard Linux machine. This is 5× faster than the 500ms target. See [benchmarks.md](benchmarks.md) for detailed numbers.

### How does it scale?

The pipeline scales linearly with node count. The `applyStyles` phase (CSS selector matching) is O(n×m) where n = nodes and m = CSS rules. For typical page sizes (<2000 nodes), performance is well within target.

### Can I run this in CI/CD?

Yes. The CLI is designed for automation. See [cli.md](cli.md#cicd-integration) for GitHub Actions examples.

## Limitations

### Known Gaps

1. **CSS value mapping** — Flutter colors, padding, and other values are emitted as raw strings, not Flutter expressions
2. **Media queries** — Parsed but not consumed by generators (output uses default styles only)
3. **Compound CSS selectors** — Not yet supported (e.g., `div.card`, `.container > .item`)
4. **Compose image source** — Uses Android drawable resources, not network URLs
5. **SwiftUI navigation** — `.navigationTitle()` requires manual `NavigationStack` wrapping

These are documented in the [roadmap](roadmap.md) and tracked as GitHub issues.
