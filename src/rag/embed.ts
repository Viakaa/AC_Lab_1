/**
 * ЕМБЕДІНГИ (крок 04): два шляхи за $0 і підробка для тестів.
 * Індексатор не знає, хто рахує вектори, — він знає лише цей інтерфейс.
 */
import { embed, embedMany } from 'ai';
import { google } from '@ai-sdk/google'; // ключ: GOOGLE_GENERATIVE_AI_API_KEY

export interface Embedder {
  /** Те, що піде в заголовок індексу: 'ollama:embeddinggemma-2:270m'. */
  readonly id: string;
  readonly dimensions: number;
  embedDocuments(texts: readonly string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

// ---------- Шлях А: локальна Ollama (обрано, див. docs/lab2/indexing.md) ----------

export function ollamaEmbedder(model = 'embeddinggemma-2:270m', dimensions = 768): Embedder {
  // та сама змінна, що й у src/models.ts; 127.0.0.1 — захист від IPv6-бага Windows
  const base = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace('localhost', '127.0.0.1');

  const call = async (input: readonly string[]): Promise<number[][]> => {
    const res = await fetch(`${base}/api/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // truncate типово true — задовгий вхід обрізався б МОВЧКИ. Нам потрібне падіння.
      body: JSON.stringify({ model, input, dimensions, truncate: false }),
    });
    if (!res.ok) throw new Error(`/api/embed ${res.status}: ${await res.text()}`);
    const data: { embeddings?: unknown } = await res.json();
    const vectors = data.embeddings;
    if (!Array.isArray(vectors) || vectors.length !== input.length) {
      throw new Error(`/api/embed: очікував ${input.length} векторів, прийшло інше`);
    }
    const out: number[][] = [];
    for (const v of vectors) {
      if (!Array.isArray(v) || v.length !== dimensions) {
        throw new Error(`/api/embed: розмірність ${Array.isArray(v) ? v.length : '?'}, очікував ${dimensions}`);
      }
      out.push(v.map(Number));
    }
    return out;
  };

  return {
    id: `ollama:${model}`,
    dimensions,
    embedDocuments: call,
    embedQuery: async (text) => {
      const [v] = await call([text]);
      if (!v) throw new Error('/api/embed: порожня відповідь');
      return v;
    },
  };
}

// ---------- Шлях Б: Gemini через AI SDK (не використовується, лишено для порівняння) ----------

export function geminiEmbedder(dimensions = 768): Embedder {
  const model = google.textEmbedding('gemini-embedding-2');

  return {
    id: `google:gemini-embedding-2@${dimensions}`,
    dimensions,
    embedDocuments: async (texts) => {
      const { embeddings, usage } = await embedMany({
        model,
        values: [...texts],
        // тримаємо паралельність низькою: ліміти безкоштовного рівня не опубліковані
        maxParallelCalls: 2,
        providerOptions: {
          google: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: dimensions },
        },
      });
      console.error(`  embedMany: ${texts.length} фрагментів, ${usage.tokens} токенів`);
      return embeddings;
    },
    embedQuery: async (text) => {
      const { embedding } = await embed({
        model,
        value: text,
        // запит — RETRIEVAL_QUERY, документ — RETRIEVAL_DOCUMENT. Це асиметрично за задумом.
        providerOptions: {
          google: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: dimensions },
        },
      });
      return embedding;
    },
  };
}

// ---------- Підробка для тестів: детерміновано, без мережі ----------

/**
 * Схожість тут — збіг слів, а не сенсу. Це НЕ модель: це спосіб перевірити
 * механіку індексу й пошуку в CI, де немає ні ключів, ні Ollama.
 */
export function fakeEmbedder(dimensions = 64): Embedder {
  const vector = (text: string): number[] => {
    const v = new Array<number>(dimensions).fill(0);
    for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
      let h = 2166136261; // FNV-1a: детермінований і однаковий на будь-якій машині
      for (let i = 0; i < word.length; i += 1) {
        h ^= word.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const k = Math.abs(h) % dimensions;
      v[k] = (v[k] ?? 0) + 1;
    }
    const norm = Math.hypot(...v) || 1;
    return v.map((x) => x / norm);
  };

  return {
    id: `fake:fnv@${dimensions}`,
    dimensions,
    embedDocuments: async (texts) => texts.map(vector),
    embedQuery: async (text) => vector(text),
  };
}