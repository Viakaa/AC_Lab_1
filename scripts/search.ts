/**
 * Гібридний пошук з командного рядка (крок 05). Потрібна запущена Ollama.
 *   npx tsx scripts/search.ts "<запит>"                    — топ-5 з цитатами
 *   npx tsx scripts/search.ts "<запит>" --explain          — три списки: вектор, слова, RRF
 *   npx tsx scripts/search.ts "<запит>" --explain --doc doc-13#0001,doc-13#0004
 *        — плюс найкращий ранг цих фрагментів (або всього документа: --doc doc-13) у кожному списку
 */
import { renderCitation, toCitation } from '../src/rag/cite';
import { ollamaEmbedder } from '../src/rag/embed';
import { bm25From, DEPTH, hybridSearchExplain } from '../src/rag/search';
import { loadIndex } from '../src/rag/store';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const query = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--doc');
  if (!query) throw new Error('використання: npx tsx scripts/search.ts "<запит>" [--explain] [--doc doc-NN]');
  const docFlag = args.indexOf('--doc');
  const doc = docFlag === -1 ? undefined : args[docFlag + 1];

  const embedder = ollamaEmbedder();
  const index = loadIndex('data/index.json', embedder);
  const words = bm25From(index);
  const { hits, vector, words: wordHits } = await hybridSearchExplain(index, words, embedder, query, 5);

  if (args.includes('--explain')) {
    const fused = (await hybridSearchExplain(index, words, embedder, query, DEPTH * 2)).hits;
    const col = (s: string, w: number) => s.padEnd(w);
    console.log(`${col('вектор (cosine)', 28)}${col('слова (BM25)', 28)}RRF (k=60)`);
    for (let i = 0; i < 10; i += 1) {
      const v = vector[i];
      const w = wordHits[i];
      const f = fused[i];
      const vs = v ? `${String(i + 1).padStart(2)}  ${v.id}  ${v.cosine.toFixed(4)}` : '';
      const ws = w ? `${String(i + 1).padStart(2)}  ${w.id}  ${w.score.toFixed(2)}` : i === 0 ? 'порожньо: жодного слова' : '';
      const fs = f ? `${String(i + 1).padStart(2)}  ${f.chunk.id}  ${f.rrf.toFixed(5)}` : '';
      console.log(`${col(vs, 28)}${col(ws, 28)}${fs}`);
    }
    if (doc) {
      const wanted = doc.split(',');
      const match = (id: string) => wanted.some((w) => id === w || id.startsWith(`${w}#`));
      const first = (list: readonly string[]) => {
        const i = list.findIndex(match);
        return i < 0 ? 'немає' : String(i + 1);
      };
      console.log(
        `# ${doc}: вектор ${first(vector.map((v) => v.id))}, слова ${first(wordHits.map((w) => w.id))}, RRF ${first(fused.map((f) => f.chunk.id))} (у топ-${DEPTH} кожної гілки)`,
      );
    }
    console.log(`# косинус найкращого фрагмента: ${vector[0]?.cosine.toFixed(4) ?? '—'}; фрагментів зі словами запиту: ${wordHits.length}`);
    return;
  }

  for (const h of hits) {
    console.log(`${renderCitation(toCitation(h.chunk, ''))}  (cosine ${h.cosine.toFixed(4)}, вектор ${h.rankVector ?? '—'}, слова ${h.rankWords ?? '—'})`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});