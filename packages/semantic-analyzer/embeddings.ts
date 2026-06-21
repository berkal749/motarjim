// Embedding-Based UI Pattern Store.
// Uses Ollama embedding models (nomic-embed-text, bge-small, etc.) to
// store known UI patterns and perform similarity matching against new nodes.
// Optional — falls back gracefully when embeddings are unavailable.

import type { StyledNode, SemanticIntent, AiDetectorConfig } from '@html-native/shared';

// -- Pattern definition --

export interface UiPattern {
  id: string;
  name: string;
  intent: SemanticIntent;
  tags: string[];
  embedding?: number[];
  serialized: string;
}

export interface PatternMatch {
  pattern: UiPattern;
  similarity: number;
  intent: SemanticIntent;
}

// -- Serialization for embedding --

function serializeForEmbedding(nodes: StyledNode[]): string {
  function walk(node: StyledNode, depth: number = 0): string {
    const tag = node.node.tagName;
    const classes = node.node.attributes.find(a => a.name === 'class')?.value || '';
    const id = node.node.attributes.find(a => a.name === 'id')?.value || '';
    const styleKeys = Object.keys(node.styles).slice(0, 8).join(' ');
    const children = node.children.map(c => walk(c, depth + 1)).join(' ');

    return `[${tag} class="${classes}" id="${id}" styles="${styleKeys}" ${children}]`;
  }
  return nodes.map(n => walk(n)).join(' ');
}

// -- Embedding API call --

async function fetchEmbedding(
  text: string,
  config: Required<AiDetectorConfig>,
): Promise<number[]> {
  const response = await fetch(`${config.baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.embeddingModel,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status}`);
  }

  const data = await response.json() as { embedding?: number[] };
  if (!data.embedding || !Array.isArray(data.embedding)) {
    throw new Error('Invalid embedding response');
  }

  return data.embedding;
}

// -- Cosine similarity --

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

// -- Built-in default patterns --

const DEFAULT_PATTERNS: UiPattern[] = [
  {
    id: 'pricing-card',
    name: 'Pricing Card',
    intent: 'Pricing',
    tags: ['pricing', 'card', 'price', 'plan'],
    serialized: '[div class="pricing-card" styles="border padding text-align" [h3 class="price" styles="font-size font-weight"] [ul class="features" styles="" [li] [li]] [button class="cta" styles="background"]]',
  },
  {
    id: 'hero-section',
    name: 'Hero Section',
    intent: 'Hero',
    tags: ['hero', 'banner', 'header'],
    serialized: '[section class="hero" styles="padding text-align background" [h1 styles="font-size"] [p styles=""][button styles="background"]]',
  },
  {
    id: 'product-card',
    name: 'Product Card',
    intent: 'ProductCard',
    tags: ['product', 'card', 'shop', 'item'],
    serialized: '[div class="product-card" styles="border border-radius" [img styles="width height"] [h3 styles="font-size"][p styles="color"][button styles="background"]]',
  },
  {
    id: 'dashboard-sidebar',
    name: 'Dashboard Sidebar',
    intent: 'Dashboard',
    tags: ['dashboard', 'sidebar', 'admin'],
    serialized: '[aside class="sidebar" styles="width background position" [nav][ul][li][li][li]]',
  },
  {
    id: 'marketing-banner',
    name: 'Marketing Banner',
    intent: 'Marketing',
    tags: ['marketing', 'banner', 'cta', 'promo'],
    serialized: '[div class="marketing-banner" styles="background padding text-align" [h2][p][button]]',
  },
  {
    id: 'navbar',
    name: 'Navigation Bar',
    intent: 'Navbar',
    tags: ['nav', 'navbar', 'navigation', 'menu'],
    serialized: '[nav class="navbar" styles="background padding display" [div class="container" styles="display align-items" [h1][ul][li][li]]]',
  },
  {
    id: 'contact-form',
    name: 'Contact Form',
    intent: 'Form',
    tags: ['form', 'contact', 'input'],
    serialized: '[form class="contact-form" styles="display flex-direction gap" [h2][input][input][button]]',
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    intent: 'Sidebar',
    tags: ['sidebar', 'side', 'drawer'],
    serialized: '[aside class="sidebar" styles="width position height" [nav][ul][li][li][li][li]]',
  },
];

// -- SemanticPatternStore --

export class SemanticPatternStore {
  private patterns: UiPattern[] = [];
  private config: Required<AiDetectorConfig>;
  private ready = false;
  private embeddingDimension = 0;

  constructor(config?: AiDetectorConfig) {
    this.config = {
      model: 'qwen2.5:7b',
      baseUrl: 'http://localhost:11434',
      timeout: 30000,
      retryCount: 2,
      batchSize: 50,
      enableEmbeddings: false,
      embeddingModel: 'nomic-embed-text',
      ...config,
    };
    this.patterns = [...DEFAULT_PATTERNS];
  }

  get isReady(): boolean {
    return this.ready;
  }

  get patternCount(): number {
    return this.patterns.length;
  }

  // -- Initialize: load default patterns and compute embeddings --

  async initialize(): Promise<void> {
    try {
      await this.computeEmbeddings();
      this.ready = true;
    } catch (err) {
      console.warn(`Embedding initialization failed (${(err as Error).message}), running without embeddings`);
      this.ready = false;
    }
  }

  // -- Add custom pattern --

  async addPattern(
    name: string,
    intent: SemanticIntent,
    tags: string[],
    nodes: StyledNode[],
  ): Promise<void> {
    const serialized = serializeForEmbedding(nodes);
    const pattern: UiPattern = {
      id: `${intent.toLowerCase()}-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name,
      intent,
      tags,
      serialized,
    };

    try {
      pattern.embedding = await fetchEmbedding(serialized, this.config);
    } catch {
      // Pattern stored without embedding
    }

    this.patterns.push(pattern);
  }

  // -- Find similar patterns --

  async findSimilar(nodes: StyledNode[], threshold: number = 0.6): Promise<PatternMatch[]> {
    const serialized = serializeForEmbedding(nodes);

    // If embeddings are enabled and ready, use semantic similarity
    if (this.ready && this.patterns.some(p => p.embedding)) {
      try {
        const queryEmbedding = await fetchEmbedding(serialized, this.config);
        if (queryEmbedding.length > 0) {
          const matches: PatternMatch[] = [];

          for (const pattern of this.patterns) {
            if (!pattern.embedding) continue;
            const similarity = cosineSimilarity(queryEmbedding, pattern.embedding);
            if (similarity >= threshold) {
              matches.push({ pattern, similarity, intent: pattern.intent });
            }
          }

          return matches.sort((a, b) => b.similarity - a.similarity);
        }
      } catch {
        // Fall through to tag-based matching
      }
    }

    // Fallback: tag-based keyword matching
    return this.matchByTags(serialized, threshold);
  }

  // -- Tag-based fallback matching --

  private matchByTags(serialized: string, threshold: number): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const lower = serialized.toLowerCase();

    for (const pattern of this.patterns) {
      const tagMatches = pattern.tags.filter(tag => lower.includes(tag)).length;
      if (tagMatches > 0) {
        const similarity = tagMatches / Math.max(pattern.tags.length, 1);
        if (similarity >= threshold) {
          matches.push({ pattern, similarity, intent: pattern.intent });
        }
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  // -- Internal: compute embeddings for all patterns --

  private async computeEmbeddings(): Promise<void> {
    for (const pattern of this.patterns) {
      try {
        pattern.embedding = await fetchEmbedding(pattern.serialized, this.config);
        if (this.embeddingDimension === 0 && pattern.embedding) {
          this.embeddingDimension = pattern.embedding.length;
        }
      } catch {
        // Skip embeddings for this pattern
      }
    }
  }

  // -- List all patterns --

  listPatterns(): UiPattern[] {
    return [...this.patterns];
  }

  // -- Remove pattern --

  removePattern(id: string): boolean {
    const index = this.patterns.findIndex(p => p.id === id);
    if (index >= 0) {
      this.patterns.splice(index, 1);
      return true;
    }
    return false;
  }
}

// -- Singleton instance --

let globalStore: SemanticPatternStore | null = null;

export async function getGlobalPatternStore(config?: AiDetectorConfig): Promise<SemanticPatternStore> {
  if (!globalStore) {
    globalStore = new SemanticPatternStore(config);
    await globalStore.initialize();
  }
  return globalStore;
}

export function resetGlobalPatternStore(): void {
  globalStore = null;
}
