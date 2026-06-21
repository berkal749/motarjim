// AI-powered IR intent inference service.
// Enriches UiNode trees with semantic intent metadata.
// Uses rule-based inference as default, with optional AI enhancement via Ollama.

import { z } from 'zod';
import type { UiNode, SemanticIntent, AiDetectorConfig } from '@html-native/shared';

// -- Zod Schema for Intent Response --

const IntentItemSchema = z.object({
  nodeId: z.string(),
  intent: z.enum([
    'Hero',
    'Card',
    'Pricing',
    'Sidebar',
    'Dashboard',
    'Navbar',
    'Footer',
    'Header',
    'Dialog',
    'Form',
    'List',
    'Grid',
    'Marketing',
    'ProductCard',
    'Unknown',
  ]),
  confidence: z.number().min(0).max(1),
});

const IntentResponseSchema = z.object({
  intents: z.array(IntentItemSchema).max(500),
});

// -- Rule-based intent inference (always runs) --

export function inferIntentRule(node: UiNode): SemanticIntent {
  const type = node.type;

  switch (type) {
    case 'NavigationBar':
    case 'Nav':
    case 'AppBar':
      return 'Navbar';
    case 'Card':
      return 'Card';
    case 'HeroSection':
      return 'Hero';
    case 'Footer':
      return 'Footer';
    case 'Sidebar':
      return 'Sidebar';
    case 'Form':
      return 'Form';
    case 'Dialog':
      return 'Form';
    case 'UnorderedList':
    case 'OrderedList':
    case 'List':
    case 'ListView':
    case 'LazyList':
      return 'List';
    case 'Grid':
      return 'Grid';
    default:
      break;
  }

  const props = node.properties;

  if (
    typeof props.className === 'string' &&
    (props.className === 'pricing' ||
      props.className === 'pricing-card' ||
      props.className === 'pricing-table')
  ) {
    return 'Pricing';
  }

  if (
    typeof props.className === 'string' &&
    (props.className === 'marketing' ||
      props.className === 'banner' ||
      props.className === 'cta' ||
      props.className === 'call-to-action')
  ) {
    return 'Marketing';
  }

  if (
    typeof props.className === 'string' &&
    (props.className === 'product' ||
      props.className === 'product-card' ||
      props.className === 'product-item')
  ) {
    return 'ProductCard';
  }

  if (
    typeof props.className === 'string' &&
    (props.className === 'dashboard' || props.className === 'dashboard-container')
  ) {
    return 'Dashboard';
  }

  return 'Unknown';
}

function assignIntents(node: UiNode): UiNode {
  const updatedNode = { ...node };
  updatedNode.semanticIntent = inferIntentRule(node);
  updatedNode.children = node.children.map(assignIntents);
  return updatedNode;
}

// -- AI-powered intent inference --

interface SerializedIrNode {
  nodeId: string;
  type: string;
  properties: Record<string, unknown>;
  childCount: number;
  semanticIntent?: string;
}

function serializeIrTree(node: UiNode): SerializedIrNode[] {
  const result: SerializedIrNode[] = [];

  function walk(n: UiNode): void {
    result.push({
      nodeId: `ir_${result.length}`,
      type: n.type,
      properties: n.properties,
      childCount: n.children.length,
      semanticIntent: n.semanticIntent,
    });
    for (const child of n.children) {
      walk(child);
    }
  }

  walk(node);
  return result;
}

function buildIntentPrompt(nodes: SerializedIrNode[]): string {
  const input = JSON.stringify(nodes, null, 2);

  return `You are a UI intent analyzer for an HTML-to-native compiler. Analyze this intermediate representation (IR) tree and determine the semantic intent of each node.

Rules:
- Return ONLY valid JSON matching {"intents": [{"nodeId": string, "intent": string, "confidence": number}]}
- Intent must be one of: Hero, Card, Pricing, Sidebar, Dashboard, Navbar, Footer, List, Grid, Marketing, ProductCard, Unknown
- confidence must be 0-1
- Use the node's type, properties, and structure to infer intent
- Do not include markdown, code fences, or explanations

Input IR:
${input.slice(0, 6000)}`;
}

function parseIntentResponse(text: string): Map<string, { intent: SemanticIntent; confidence: number }> {
  try {
    const parsed = JSON.parse(text);
    const { intents } = IntentResponseSchema.parse(parsed);
    const map = new Map<string, { intent: SemanticIntent; confidence: number }>();
    for (const item of intents) {
      map.set(item.nodeId, { intent: item.intent as SemanticIntent, confidence: item.confidence });
    }
    return map;
  } catch {
    return new Map();
  }
}

// -- Retry helper --

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.warn(`Intent inference attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Intent inference retry exhausted');
}

// -- Main Service --

export interface AIIntentInferenceConfig {
  enabled?: boolean;
  aiConfig?: AiDetectorConfig;
}

export async function enrichWithIntent(
  node: UiNode,
  config?: AIIntentInferenceConfig,
): Promise<UiNode> {
  const ruleEnriched = assignIntents(node);

  if (!config?.enabled) {
    return ruleEnriched;
  }

  try {
    const model = config.aiConfig?.model ?? 'qwen2.5:7b';
    const baseUrl = config.aiConfig?.baseUrl ?? 'http://localhost:11434';
    const timeout = config.aiConfig?.timeout ?? 30000;
    const retryCount = config.aiConfig?.retryCount ?? 1;

    const serialized = serializeIrTree(ruleEnriched);
    const prompt = buildIntentPrompt(serialized);

    const responseText = await withRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
            options: { temperature: 0.1 },
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(`Ollama returned ${response.status}`);

        const data = await response.json() as { response?: string };
        if (!data.response) throw new Error('Empty response');
        return data.response;
      } finally {
        clearTimeout(timeoutId);
      }
    }, retryCount);

    const aiIntents = parseIntentResponse(responseText);
    if (aiIntents.size === 0) return ruleEnriched;

    function mergeIntents(n: UiNode, index: number): UiNode {
      const nodeId = `ir_${index}`;
      const aiMatch = aiIntents.get(nodeId);
      if (aiMatch && aiMatch.confidence > 0.7 && aiMatch.intent !== 'Unknown') {
        return { ...n, semanticIntent: aiMatch.intent };
      }
      return n;
    }

    function walkAndMerge(n: UiNode, startIndex: number): { node: UiNode; nextIndex: number } {
      let idx = startIndex;
      const mergedNode = mergeIntents(n, idx);
      idx++;
      const mergedChildren: UiNode[] = [];
      for (const child of mergedNode.children) {
        const result = walkAndMerge(child, idx);
        mergedChildren.push(result.node);
        idx = result.nextIndex;
      }
      return { node: { ...mergedNode, children: mergedChildren }, nextIndex: idx };
    }

    const result = walkAndMerge(ruleEnriched, 0);
    return result.node;
  } catch (err) {
    console.warn(`AI intent inference unavailable (${(err as Error).message}), using rule-based`);
    return ruleEnriched;
  }
}

export function enrichWithIntentSync(node: UiNode): UiNode {
  return assignIntents(node);
}
