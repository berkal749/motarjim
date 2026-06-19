# Benchmarks

## Current Results

**Date:** 2026-06-19  
**Target:** 500ms pipeline for 1000 HTML nodes  
**Result:** ✓ **PASS** — 98ms median (5× headroom)

## Methodology

### Fixture

- **File:** `benchmarks/fixtures/1000-nodes.html` + `1000-nodes.css`
- **Definition:** 1001 raw HTML elements (non-text `<tags>`)
- **Post-optimization IR nodes:** 1209 (the optimizer creates wrappers for multiple children)
- **CSS:** 4655 bytes with 50+ rules and 4 media queries
- **Content:** Mixed patterns — nav, hero, card grid (106 cards), contact form, footer — exercising all pipeline stages realistically

### Measurement

- **Tool:** `benchmarks/run.ts` using `performance.now()`
- **Iterations:** 10 per phase
- **Warm-up:** 3 iterations before measurement
- **Statistics:** min, max, mean, median reported
- **Scope:** Pipeline = parseHtml + parseCss + applyStyles + detectSemantics + styledNodeToIr + optimize
- **Generators:** Code generation time reported separately (not counted in 500ms target)

### Hardware

- CPU: Linux x64
- Node.js: v20.20.2
- No special hardware optimizations

## Results Table

| Phase | Mean (ms) | Min (ms) | Max (ms) | Median (ms) |
|-------|-----------|----------|----------|-------------|
| Parse HTML | 20.14 | 14.04 | 33.03 | 18.76 |
| Parse CSS | 6.31 | 4.27 | 9.05 | 6.43 |
| Apply styles | 47.64 | 34.53 | 78.81 | 43.52 |
| Semantic analysis | 5.08 | 1.52 | 10.35 | 4.62 |
| IR conversion | 25.16 | 15.34 | 47.08 | 22.36 |
| Optimization | 3.46 | 1.15 | 8.39 | 2.72 |
| **Pipeline total** | **107.79** | | | **98.40** |
| Flutter code gen | 9.11 | 3.22 | 29.87 | 6.04 |
| Compose code gen | 3.57 | 1.55 | 4.98 | 3.49 |
| SwiftUI code gen | 3.58 | 1.55 | 5.02 | 3.60 |
| **All 3 generators** | | | | **13.13** |
| **Grand total** | | | | **111.53** |

## Phase Distribution

```
Apply styles     ████████████████████████████████████████ 44.2%
IR conversion    ██████████████████████                   22.7%
Parse HTML       █████████████████                       19.1%
Parse CSS        ██████                                    6.5%
Semantic anal.   ████                                      4.7%
Optimization     ██                                        2.8%
```

## Analysis

### Bottlenecks

1. **Apply styles (43.5ms, 44%)** — The dominant phase. For each of 1001 nodes, `resolveStyles()` iterates all CSS rules and matches selectors. With ~50 CSS rules, this is ~50,000 selector match calls. This O(n×m) behavior is expected and acceptable at current scale.

2. **IR conversion (22.4ms, 23%)** — Tree traversal with type inference, property extraction, and child processing.

3. **Parse HTML (18.8ms, 19%)** — parse5 document parsing with tree construction.

### Generators

All three generators combined add only 13ms — negligible compared to the pipeline. Code generation is not the bottleneck.

## Future Targets

| Scale | Current Time | Target | Status |
|-------|-------------|--------|--------|
| 1,000 nodes | 98ms | 500ms | ✓ PASS (5× headroom) |
| 5,000 nodes | ~500ms (estimated) | 500ms | Needs verification |
| 10,000 nodes | ~1s (estimated) | 500ms | Likely needs optimization |

## Optimization Strategies (for 10k+ scale)

If scaling beyond 5,000 nodes, the `applyStyles` phase becomes the bottleneck. Potential optimizations:

1. **Rule index** — Precompute a selector index (bucket rules by tag/class/id) to reduce matching from O(n×m) to O(n+k)
2. **Parallel processing** — Node tree traversal is embarrassingly parallel at the sibling level
3. **Memoization** — Identical subtrees (same tag, classes, styles) could share resolved styles

## Running Benchmarks

```bash
# Generate fixtures (if not already present)
npm run gen-fixtures

# Run benchmark
npm run bench
```

## Results History

| Date | Pipeline (ms) | Headroom | Notes |
|------|--------------|----------|-------|
| 2026-06-19 | 98 | 5.1× | PostCSS + generator-core refactor complete |
