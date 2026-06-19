# AI Enhancement

## Purpose

An optional layer that uses a local LLM (via Ollama) to improve semantic component detection beyond what rule-based heuristics can achieve.

## Architecture

```
StyledNode[]
    │
    ├─── rule-based detector ───▶ SemanticHint[]
    │        (always runs)
    │
    └─── AI detector (optional) ───▶ SemanticHint[]
             │
             ├── Ollama available ──▶ parse JSON response
             │
             └── Ollama unavailable ──▶ empty AI hints
                         (fallback)

    └─── Merge: AI hints + rule hints
         Sort by confidence
         Deduplicate by (type, nodeId)
```

## Prerequisites

- [Ollama](https://ollama.ai) installed and running locally
- At least one model pulled (default: `qwen2.5:7b`)
- Default endpoint: `http://localhost:11434`

## Usage

### CLI

```bash
# Basic usage with default model
html-native convert --input page.html --css styles.css --target flutter --ai-enhance

# Custom model
html-native convert --input page.html --css styles.css --target compose --ai-enhance --ai-model llama3.2

# Custom Ollama endpoint
export OLLAMA_HOST=http://my-server:11434
html-native convert --input page.html --css styles.css --target swiftui --ai-enhance
```

### Programmatic

```typescript
import { createAiDetector } from '@html-native/semantic-analyzer/ai';

const detector = createAiDetector({
  model: 'llama3.2',          // default: qwen2.5:7b
  baseUrl: 'http://localhost:11434',  // default
  timeout: 30000,              // 30 seconds
});

const hints = await detector(styledNodes);
```

## How It Works

1. The styled HTML tree is serialized to a compact JSON representation (tag, classes, id, styles, children)
2. A prompt instructs Ollama to return JSON-only semantic hints
3. The response is parsed and validated
4. AI hints are merged with rule-based hints
5. Duplicates are removed (higher confidence wins)
6. Results are sorted by confidence

## Prompt Design

The AI prompt is engineered to:

- **Return structured JSON only** — no markdown, no explanations, no conversation
- **Detect specific components:** cards, navigation, forms, hero sections, dialogs, reusable components
- **Never generate platform code** — the prompt explicitly forbids Flutter, SwiftUI, and Compose output
- **Operate within context limits** — input is truncated to 3000 characters

## Fallback Behavior

The AI layer is designed to be **non-blocking and non-breaking**:

| Scenario | Behavior |
|----------|----------|
| Ollama not installed | Logs warning, falls back to rule-based |
| Ollama not running | Logs warning, falls back to rule-based |
| Network timeout | Logs warning, falls back to rule-based |
| Invalid JSON response | Returns empty AI hints, rule-based results used |
| Empty response | Falls back to rule-based |
| Model doesn't exist | Ollama returns error, falls back to rule-based |

## Merge Strategy

```typescript
// AI hints + rule hints combined
const combined = [...aiHints, ...ruleHints];

// Sorted by confidence (highest first)
combined.sort((a, b) => b.confidence - a.confidence);

// Deduplicated by type + nodeId
const seen = new Set<string>();
return combined.filter(h => {
  const key = `${h.type}-${h.node.nodeId}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
```

## Performance Implications

- Ollama inference adds significant latency (typically 1-5 seconds per request depending on model and hardware)
- The 30-second timeout prevents hanging on unavailable servers
- Rule-based detection runs in parallel (synchronously) and completes in <5ms
- For CI/CD pipelines, consider omitting `--ai-enhance` for speed and using rule-based detection only

## Testing

The AI module has 3 dedicated tests:

1. **Fallback on unavailable Ollama** — verifies rule-based fallback when Ollama can't be reached
2. **Synchronous pipeline without AI** — verifies the pipeline works normally without `--ai-enhance`
3. **No platform code generation** — verifies the AI module never produces Flutter/Compose/SwiftUI code
