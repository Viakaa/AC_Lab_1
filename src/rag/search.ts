/**
 * ГІБРИДНИЙ ПОШУК (крок 05): вектор (косинус) + слова (BM25), злиття RRF.
 * З кожної гілки беремо DEPTH до злиття, віддаємо topK.
 */
import { cosineSimilarity } from 'ai';

import { buildBm25, searchBm25, type Bm25Index } from './bm25';
import type { Embedder } from './embed';
import { rrf, RRF_K } from './rrf';
import type { IndexFile, IndexedChunk } from './store';

export const DEPTH = 20; // скільки беремо з кожної гілки ДО злиття

/**
 * Поріг відмови (docs/lab2/retrieval.md, розділ 4): якщо косинус НАЙКРАЩОГО фрагмента
 * нижчий — асистент відмовляється. Відкалібровано на 22 запитах набору: найвищий
 * unanswerable — 0,8152, найнижчий запит із відповіддю — 0,7974 (q-16), наступний — 0,8224.
 * Бал RRF порогом бути не може: він залежить лише від рангів.
 */
export const REFUSE_COSINE = 0.82;

export interface Hit {
  readonly chunk: IndexedChunk;
  readonly rrf: number;
  readonly cosine: number;
  /** Ранги з 1; null — цієї гілки фрагмент не знайшла. Саме це йде в retrieval.md. */
  readonly rankVector: number | null;
  readonly rankWords: number | null;
}

export interface Explain {
  readonly hits: Hit[];
  readonly vector: { id: string; cosine: number }[];
  readonly words: { id: string; score: number }[];
  /** Косинус найкращого фрагмента у всьому індексі — за ним рішення про відмову. */
  readonly topCosine: number;
}

export function bm25From(index: IndexFile): Bm25Index {
  // шукаємо по тому ж тексту, що й ембедимо: заголовок усередині фрагмента — навмисно
  return buildBm25(index.chunks.map((c) => ({ id: c.id, text: c.text })));
}

export async function hybridSearchExplain(
  index: IndexFile,
  words: Bm25Index,
  embedder: Embedder,
  query: string,
  topK = 5,
): Promise<Explain> {
  const qv = await embedder.embedQuery(query);
  const cosines = new Map(index.chunks.map((c) => [c.id, cosineSimilarity(qv, c.vector)]));

  const vector = [...cosines.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, DEPTH)
    .map(([id, cosine]) => ({ id, cosine }));
  const wordHits = searchBm25(words, query, DEPTH);
  const vectorList = vector.map((v) => v.id);
  const wordList = wordHits.map((r) => r.id);

  const byId = new Map(index.chunks.map((c) => [c.id, c]));
  const rank = (list: readonly string[], id: string): number | null => {
    const i = list.indexOf(id);
    return i < 0 ? null : i + 1;
  };

  const hits: Hit[] = [];
  for (const { id, score } of rrf([vectorList, wordList], RRF_K).slice(0, topK)) {
    const chunk = byId.get(id);
    if (!chunk) continue;
    hits.push({
      chunk,
      rrf: score,
      cosine: cosines.get(id) ?? 0,
      rankVector: rank(vectorList, id),
      rankWords: rank(wordList, id),
    });
  }
  return { hits, vector, words: wordHits, topCosine: vector[0]?.cosine ?? 0 };
}

export async function hybridSearch(
  index: IndexFile,
  words: Bm25Index,
  embedder: Embedder,
  query: string,
  topK = 5,
): Promise<Hit[]> {
  return (await hybridSearchExplain(index, words, embedder, query, topK)).hits;
}

/** Правило відмови: найкращий фрагмент недостатньо схожий на запит. */
export function shouldRefuse(topCosine: number, threshold = REFUSE_COSINE): boolean {
  return topCosine < threshold;
}