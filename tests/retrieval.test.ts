import { describe, expect, it } from 'vitest';

import { buildBm25, searchBm25, tokenize } from '../src/rag/bm25';
import { validateAnswer } from '../src/rag/cite';
import { fakeEmbedder } from '../src/rag/embed';
import { rrf } from '../src/rag/rrf';
import { bm25From, hybridSearchExplain, REFUSE_COSINE, shouldRefuse } from '../src/rag/search';
import type { IndexFile } from '../src/rag/store';

describe('bm25', () => {
  const docs = [
    { id: 'c-1', text: 'Помилка E-418 означає, що формат заявки не підтримується.' },
    { id: 'c-2', text: 'Відмова у реєстрації оскаржується протягом тридцяти днів.' },
    { id: 'c-3', text: 'Заявка подається через особистий кабінет.' },
  ];
  const index = buildBm25(docs);

  it('бачить кирилицю', () => {
    expect(tokenize('Помилка E-418')).toEqual(['помилка', '418']);
  });

  it('знаходить рідкісний точний рядок', () => {
    expect(searchBm25(index, 'E-418')[0]?.id).toBe('c-1');
  });

  it('нічого не повертає, коли спільних слів немає', () => {
    // стемінгу немає, тому «відхилення» не збігається з «відмова»
    expect(searchBm25(index, 'куди звертатися після відхилення')).toEqual([]);
  });
});

describe('rrf', () => {
  it('той самий розбір, що в методичці', () => {
    const fused = rrf([
      ['A', 'B', 'C'],
      ['C', 'A', 'D'],
    ]);
    expect(fused.map((r) => r.id)).toEqual(['A', 'C', 'B', 'D']);
    expect(fused[0]?.score).toBeCloseTo(1 / 61 + 1 / 62, 10);
    // згода двох гілок перебиває перше місце в одній
    expect(fused[0]?.score ?? 0).toBeGreaterThan(fused[1]?.score ?? 0);
  });

  it('ранги рахуються з одиниці', () => {
    expect(rrf([['A']])[0]?.score).toBeCloseTo(1 / 61, 10);
  });

  it('відсутній у списку документ не додає нічого', () => {
    expect(rrf([['A', 'B'], ['A']]).find((r) => r.id === 'B')?.score).toBeCloseTo(1 / 62, 10);
  });
});

describe('validateAnswer', () => {
  const served = [{ id: 'doc-03#0004' }];

  it('ловить відповідь без цитати', () => {
    expect(validateAnswer('Тридцять днів.', served).join(' ')).toContain('немає жодної цитати');
  });

  it('ловить цитату на невидане', () => {
    expect(validateAnswer('Тридцять днів [doc-99#0001].', served).join(' ')).toContain('не давали');
  });

  it('приймає цитату на видане', () => {
    expect(validateAnswer('Тридцять днів [doc-03#0004].', served)).toEqual([]);
  });
});

describe('гібридний пошук на мінікорпусі з підробленим ембедером', () => {
  const embedder = fakeEmbedder();
  const texts = [
    { id: 'doc-01#0000', text: 'Set the test timeout to thirty seconds in the config.' },
    { id: 'doc-02#0000', text: 'Use --debug to open the inspector.' },
    { id: 'doc-03#0000', text: 'Snapshots are updated with the -u flag.' },
  ];

  const build = async (): Promise<IndexFile> => {
    const vectors = await embedder.embedDocuments(texts.map((t) => t.text));
    return {
      version: 1,
      builtAt: '2026-01-01T00:00:00.000Z',
      embedder: embedder.id,
      dimensions: embedder.dimensions,
      rule: { maxChars: 1200, minChars: 200, overlapChars: 120 },
      normalization: 'test',
      documents: [],
      chunks: texts.map((t, i) => ({
        ...t,
        docId: t.id.slice(0, 6),
        heading: '',
        start: 0,
        end: t.text.length,
        vector: vectors[i] ?? [],
      })),
    };
  };

  it('ставить першим фрагмент, який знайшли обидві гілки', async () => {
    const index = await build();
    const { hits } = await hybridSearchExplain(index, bm25From(index), embedder, 'open the inspector with debug');
    expect(hits[0]?.chunk.id).toBe('doc-02#0000');
    expect(hits[0]?.rankVector).toBe(1);
    expect(hits[0]?.rankWords).toBe(1);
  });

  it('повертає косинус найкращого фрагмента для правила відмови', async () => {
    const index = await build();
    const { topCosine } = await hybridSearchExplain(index, bm25From(index), embedder, 'zzz qqq');
    // у підробленого ембедера 64 «кошики» слів, тож випадкові збіги дають не 0, а малий косинус
    expect(topCosine).toBeLessThan(REFUSE_COSINE);
    expect(shouldRefuse(topCosine)).toBe(true);
  });
});

describe('правило відмови', () => {
  it('поріг відкалібровано між 0,8152 і 0,8224', () => {
    expect(REFUSE_COSINE).toBeGreaterThan(0.8152);
    expect(REFUSE_COSINE).toBeLessThan(0.8224);
    expect(shouldRefuse(0.8152)).toBe(true);
    expect(shouldRefuse(0.8224)).toBe(false);
  });
});