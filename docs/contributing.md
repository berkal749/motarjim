# Contributing

## Setup

```bash
# Clone the repository
git clone <repo-url>
cd html-native-engine

# Install dependencies
npm install

# Verify setup
npm test
```

## Project Structure

```
html-native-engine/
├── packages/
│   ├── shared/                 # Core types
│   ├── parser/                 # HTML → HtmlNode
│   ├── css-analyzer/           # CSS → ResolvedStyles
│   ├── semantic-analyzer/      # Component detection
│   ├── ir/                     # Platform-neutral IR
│   ├── optimizer/              # IR optimization
│   ├── generator-core/         # Shared gen infrastructure
│   ├── generators/
│   │   ├── flutter/            # Dart code gen
│   │   ├── compose/            # Kotlin code gen
│   │   └── swiftui/            # Swift code gen
│   └── cli/                    # CLI entry point
├── tests/                      # Test suite
├── benchmarks/                 # Performance benchmarks
└── docs/                       # Documentation
```

## Development Workflow

### 1. Understand the Pipeline

Before making changes, read [docs/architecture.md](architecture.md) to understand how the stages connect. Each package has a single responsibility and a clear interface.

### 2. Make Changes

- Edit source files in `packages/`
- All packages use TypeScript strict mode
- Follow existing code style (existing patterns, not new abstractions)
- Don't import platform-specific code across packages (IR is the boundary)

### 3. Test

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run tests/parser.test.ts

# Watch mode during development
npm run test:watch

# Update snapshots (when output changes intentionally)
npx vitest run --update
```

### 4. Type Check

```bash
npm run typecheck
```
Zero TypeScript errors required. Strict mode enforced.

### 5. Benchmark

```bash
# Generate fixtures (if needed)
npm run gen-fixtures

# Run benchmark
npm run bench
```

Ensure performance doesn't regress significantly. Current target: 500ms for 1000 nodes.

### 6. Build

```bash
npm run build
```
Output goes to `dist/`. The CLI binary is at `dist/cli/index.js`.

## Testing Guidelines

### Test Locations

| Test File | What It Tests |
|-----------|--------------|
| `tests/parser.test.ts` | HTML parsing (14 tests) |
| `tests/css-analyzer.test.ts` | CSS parsing, selector matching, media queries (18 tests) |
| `tests/ai.test.ts` | AI enhancement fallback (3 tests) |
| `tests/generators.test.ts` | All generators, snapshots, pipeline (36 tests) |

### Writing Tests

- Add tests to existing files when testing existing features
- Create new test files for new packages
- Use snapshot tests for generated code output
- Test edge cases (empty input, malformed input, boundary values)
- Don't test internal implementation details — test the public API

### Snapshot Tests

Snapshot tests (12 total) cover nav, card, hero, and contact form patterns across all 3 platforms.

When generated output changes **intentionally**, update with:
```bash
npx vitest run --update
```

When output changes unintentionally, investigate — a snapshot change means a behavior change.

## Commit Conventions

Use [conventional commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(parser): add support for custom elements
fix(generator-flutter): emit valid Dart property names
refactor(generator-core): extract shared traversal logic
test(generators): add structural validity assertions
docs(readme): update architecture diagram
bench: add 1000-node performance results
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `bench`, `chore`

## Pull Request Process

1. Create a feature branch from `main`
2. Make changes with clear commit messages
3. Run `npm test` and `npm run typecheck` — both must pass
4. Run `npm run bench` — performance must not regress
5. Open a PR with a description of:
   - What the change does
   - Why it's needed
   - How it was tested
   - Any breaking changes or migration steps

## Coding Standards

### TypeScript

- **Strict mode** enabled. No exceptions.
- **No `any`** unless absolutely required (and documented). Use proper types.
- **No dead code** — unused exports are removed.
- **Functional style** preferred — avoid mutating inputs, return new objects.

### Architecture

- **Single responsibility** per package. The parser doesn't understand CSS; the generators don't parse HTML.
- **IR is the boundary.** Generators never import from parser, css-analyzer, or semantic-analyzer.
- **Optimize once.** Generators expect pre-optimized IR. Don't call `optimize()` inside generators.
- **Don't over-abstract.** If three implementations are similar-but-different, keep them independent rather than forcing a shared abstraction.

### Naming

- **Packages:** lowercase with hyphens (`css-analyzer`, `generator-core`)
- **Functions:** camelCase (`parseHtml`, `detectSemantics`)
- **Types/Interfaces:** PascalCase (`HtmlNode`, `UiNode`, `NodeEmitter`)
- **Files:** lowercase with hyphens matching package name

## Package Dependencies

Each package declares its own dependencies in its `package.json`. The root `package.json` should only contain devDependencies and workspace configuration.

Adding a new dependency:
```bash
npm install <package> --workspace=packages/<name> --save
```

## Documentation

- Update `docs/` for any behavior changes
- Run `npm run format` before committing
- Update `CHANGELOG.md` for notable changes
