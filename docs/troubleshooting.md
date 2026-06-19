# Troubleshooting

## Build Failures

### `npx tsc --noEmit` shows errors

**Cause:** TypeScript strict mode violations. Common issues:
- Using `any` instead of proper types
- Importing from a path that doesn't exist
- Missing type declarations for external packages

**Fix:**
```bash
# Check which files have errors
npx tsc --noEmit

# If parse5 types are missing, install them
npm install --save-dev @types/parse5 --workspace=packages/parser

# Check your import paths — use .js extension for local imports
// Correct
import { parseHtml } from '../packages/parser/index.js';
// Wrong
import { parseHtml } from '../packages/parser';
```

### `npm install` fails

**Cause:** Workspace dependency conflict or lockfile mismatch.

**Fix:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# If a specific package fails, check its package.json for missing deps
```

## Parser Issues

### HTML elements are missing from the output

**Cause:** The parser only extracts elements from `<body>`. Elements in `<head>` or before/after the document are dropped.

**Check:** Verify your HTML has a `<body>` section containing the target elements.

### Text content is missing

**Cause:** Text nodes with only whitespace are stripped during parsing.

**Check:** Ensure text content is non-empty and not purely whitespace.

### Self-closing tags don't work

**Cause:** Only standard void elements (`<img>`, `<input>`, `<br>`, `<hr>`) are self-closing in HTML5. Custom elements or non-void elements must have closing tags.

**Fix:** Use `<img />` or `<input />` syntax, or ensure proper closing tags for non-void elements.

## CSS Issues

### Styles are not applied

**Checklist:**
1. CSS file is correctly specified with `--css` flag
2. Selectors match your HTML (tag, class, or id)
3. Compound selectors (`div.card`, `.container > .item`) are not supported yet
4. Property names match the [supported list](css-analyzer.md#supported-css-properties)

### Media queries don't affect output

**Known limitation:** Media queries are parsed and represented in the IR, but generators don't consume them yet. The generated code uses the default (non-media-query) styles. See [roadmap](roadmap.md) for planned support.

### Malformed CSS causes empty output

**Check:** The CSS analyzer wraps `postcss.parse()` in a try-catch. If your CSS is malformed, a warning is logged and an empty stylesheet is returned.

**Fix:** Validate your CSS with a linter before passing it to the compiler.

## Generator Issues

### Flutter: Generated code has invalid property names

**Cause:** CSS property names in camelCase are emitted directly. If you see `_` in property names, you're using an older version that had `camelToSnake()`.

**Fix:** Update to the latest version where `camelToSnake()` has been removed.

### Flutter: Colors and values are strings, not Flutter expressions

**Known limitation:** The current Flutter generator emits CSS values as raw strings (`color: "blue"`) rather than Flutter expressions (`color: Colors.blue`). This is a known area for improvement.

**Workaround:** Edit the generated Dart file to replace string values with proper Flutter expressions.

### Compose: Images don't compile

**Cause:** The Compose generator uses `painterResource(id = R.drawable.${src})`, which requires Android drawable resources. HTML `src` attributes containing URLs will not work.

**Workaround:**
- Use Android drawable resource names in `src`
- Replace the generated code with Coil's `AsyncImage(model = "...")` for network images

### SwiftUI: Navigation title doesn't appear

**Cause:** `.navigationTitle("...")` is a view modifier that requires a parent `NavigationStack` or `NavigationView`.

**Fix:** Wrap the generated view:
```swift
NavigationStack {
    GeneratedView()
}
```

## AI Issues

### `--ai-enhance` flag has no effect

**Check:**
1. Is Ollama installed? `ollama --version`
2. Is Ollama running? `ollama serve`
3. Is the default model pulled? `ollama pull qwen2.5:7b`
4. Is Ollama accessible at `http://localhost:11434`?
5. Did you specify a custom endpoint? `OLLAMA_HOST` env var

### AI enhancement is slow

Ollama inference typically takes 1-5 seconds on consumer hardware. The 30-second timeout prevents hanging. For faster results:

- Use a smaller model (`llama3.2:3b` instead of `qwen2.5:7b`)
- Use rule-based detection (omit `--ai-enhance`)
- Use a GPU-accelerated Ollama setup

## Snapshot Failures

### Snapshot tests fail after a change

**This is expected if your change intentionally alters generated output.**

**Update snapshots:**
```bash
npx vitest run --update
```

**If the change was unintentional:**
Investigate the diff. Snapshot changes mean code generation behavior changed.

### Snapshot tests are flaky

Snapshots are deterministic — same input always produces the same output. If snapshots fail intermittently:

1. Check for non-deterministic code (e.g., timestamps in output, hash-based IDs)
2. Verify you're not mutating shared state between tests
3. Run tests sequentially: `npx vitest run --sequence`

## Performance Regressions

### Pipeline is slower than expected

**Run the benchmark:**
```bash
npm run bench
```

**Compare to baseline:** Current baseline is 98ms median for 1000 nodes. If your change causes a regression:

1. Check the per-phase breakdown — which phase is slower?
2. If `applyStyles` is slow, you may have added CSS rules without considering selector matching cost
3. If `parseHtml` is slow, you may have added expensive tree operations
4. If code generation is slow, check for O(n²) operations in emitter methods

## Getting Help

- Open a [GitHub Issue](https://github.com/abdelrzz9/motarjim/issues/new)
- Check [docs/faq.md](faq.md) for common questions
- Review [docs/architecture.md](architecture.md) for understanding the system
