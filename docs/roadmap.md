# Roadmap

## Completed

### Phase 1 — Core Pipeline ✓
- [x] HTML parser (parse5)
- [x] CSS analyzer (PostCSS) with media query support
- [x] Semantic analyzer (rule-based component detection)
- [x] IR (platform-neutral intermediate representation)
- [x] Optimizer (3 passes: removeEmpty, mergeText, flattenContainers)
- [x] Flutter code generator
- [x] Compose code generator
- [x] SwiftUI code generator
- [x] Shared generator infrastructure (generator-core)

### Phase 2 — Integration ✓
- [x] End-to-end pipeline (CLI + programmatic)
- [x] 71 tests across all packages
- [x] 12 snapshot tests for generated output
- [x] Performance benchmarks (100ms for 1000 nodes)
- [x] Optional Ollama AI enhancement

### Phase 3 — Quality ✓
- [x] Generator-core refactor (shared traversal/formatting)
- [x] Single-point optimization (no double-optimization)
- [x] Configurable output names (default: GeneratedView)
- [x] Structural validity tests (balanced braces)
- [x] Documentation overhaul
- [x] Repository audit and fixes

## In Progress

### Phase 4 — Production Hardening
- [ ] Configurable class/struct/function name via CLI flag
- [ ] Package.json `exports` maps for production builds
- [ ] Source maps (HTML node → generated code line)
- [ ] Incremental compilation support
- [ ] CSS cascade specificity calculator

## Planned

### Phase 5 — CSS Value Mapping
- [ ] Flutter: map CSS colors to `Colors.*` / `Color(0xFF...)`
- [ ] Flutter: map CSS padding to `EdgeInsets.all()` / `EdgeInsets.symmetric()`
- [ ] Compose: map CSS colors to `Color()` / `MaterialTheme.colorScheme`
- [ ] SwiftUI: map CSS colors to `Color()` / `.foregroundColor()`
- [ ] Proper font size mapping with platform-appropriate units

### Phase 6 — Responsive Design
- [ ] Consume media query hints in generators
- [ ] Generate platform-native responsive layout code
- [ ] Flutter: `LayoutBuilder` + breakpoint conditions
- [ ] Compose: `BoxWithConstraints` + `Modifier.widthIn()`
- [ ] SwiftUI: `@Environment(\.horizontalSizeClass)` + `ViewThatFits`

### Phase 7 — Advanced CSS Support
- [ ] Compound selectors (`div.card`, `.container > .item`)
- [ ] Pseudo-classes (`:hover`, `:focus`, `:nth-child`)
- [ ] CSS variables / custom properties
- [ ] Flexbox properties (justify-content, align-items, flex-wrap)
- [ ] Grid layout properties (grid-template-columns, grid-gap)
- [ ] Animation and transition support
- [ ] Gradient support (linear-gradient, radial-gradient)

### Phase 8 — Developer Experience
- [ ] Watch mode (auto-recompile on file change)
- [ ] Pretty-print output (configurable indentation)
- [ ] Error reporting with source locations
- [ ] Config file support (`html-native.json`)
- [ ] Multiple file/page compilation
- [ ] Plugin system for custom emitters

### Phase 9 — AI & Intelligence
- [ ] Improve AI prompt engineering for higher-quality hints
- [ ] Caching of AI results (avoid re-querying unchanged trees)
- [ ] Support for additional Ollama model families
- [ ] Confidence threshold configuration

### Phase 10 — Ecosystem
- [ ] VS Code extension (syntax highlighting for generated files)
- [ ] MCP server integration for IDE tooling
- [ ] GitHub Actions marketplace action
- [ ] Published npm package
- [ ] API documentation site (Docusaurus)

## Future Considerations

### Performance Targets

| Scale | Current | Target | Timeline |
|-------|---------|--------|----------|
| 1,000 nodes | 98ms | 500ms | ✓ Met |
| 5,000 nodes | ~500ms (est.) | 500ms | Phase 4 |
| 10,000 nodes | ~1s (est.) | 500ms | Phase 6 |
| 50,000 nodes | ~5s (est.) | 2s | Phase 8 |

### Platform Expansion

- [ ] React Native support
- [ ] UIKit (iOS) support
- [ ] WinUI 3 (Windows) support
- [ ] Jetpack Views (Android XML) support

## How to Contribute

See [contributing.md](contributing.md) for development setup and guidelines. Priority areas for community contributions:

1. CSS property mapping improvements (Phase 5)
2. Additional CSS selector support (Phase 7)
3. Watch mode implementation (Phase 8)
4. Documentation and examples
