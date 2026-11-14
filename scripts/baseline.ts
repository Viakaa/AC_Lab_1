/**
 * Базова лінія без пошуку (Лабораторна 2, крок 01).
 * Кожен запит з еталонного набору йде до моделі БЕЗ жодного документа.
 * Мережа потрібна, тому запускається вручну, як скрипти вимірювань Лаб. 1:
 *   npx tsx --env-file=.env.local scripts/baseline.ts docs/lab2/golden/queries.jsonl ollama-messages
 *   npx tsx --env-file=.env.local scripts/baseline.ts docs/lab2/golden/queries.jsonl gemini
 * Вердикти (correct / partial / wrong / refused) ставить людина за правилом із baseline.md.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { createChatAdapter, createMessagesAdapter } from '../src/agent/adapters';
import type { Model } from '../src/agent/agent-loop';
import { addUsage, priceUsd, ZERO_USAGE, type Usage } from '../src/cost';
import { CATALOG, type ModelSpec } from '../src/models';

interface GoldenQuery {
  readonly id: string;
  readonly query: string;
  readonly tags: readonly string[];
}

// Промпт фіксований: на кроці 06 той самий текст, лише з документами в контексті.
const SYSTEM =
  'You answer questions about Playwright and Vitest documentation. ' +
  'If you do not know the answer, say so plainly instead of guessing. Answer briefly.';

function pick(target: string): { model: Model; name: string; spec: ModelSpec } {
  if (target === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY відсутній у .env.local');
    const spec: ModelSpec = CATALOG['gemini-3.8-flash'];
    return {
      name: spec.id,
      spec,
      model: createChatAdapter({
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        model: spec.id,
        apiKey,
      }),
    };
  }
  if (target === 'ollama-messages') {
    const name = process.env.OLLAMA_MODEL ?? 'qwen2.5-coder:7b';
    const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace('localhost', '127.0.0.1');
    const spec: ModelSpec = {
      id: name,
      provider: 'ollama',
      inputPerMTok: 0,
      outputPerMTok: 0,
      pricingUrl: 'https://ollama.com/library',
    };
    return { name, spec, model: createMessagesAdapter({ url: `${baseUrl}/v1/messages`, model: name }) };
  }
  throw new Error(`Невідома ціль: ${target} (gemini | ollama-messages)`);
}

function readQueries(file: string): GoldenQuery[] {
  return readFileSync(file, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map((l): GoldenQuery => {
      const o: { id: string; query: string; tags: string[] } = JSON.parse(l);
      return { id: o.id, query: o.query, tags: o.tags };
    });
}

function median(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  const hi = s[m] ?? 0;
  const lo = s[m - 1] ?? hi;
  return s.length % 2 === 0 ? (lo + hi) / 2 : hi;
}

async function main(): Promise<void> {
  const file = process.argv[2] ?? 'docs/lab2/golden/queries.jsonl';
  const target = process.argv[3] ?? 'ollama-messages';
  const { model, name, spec } = pick(target);
  const queries = readQueries(file);

  let total: Usage = ZERO_USAGE;
  const latencies: number[] = [];
  const rows: string[] = [];
  const raw: string[] = [];

  for (const q of queries) {
    const start = performance.now();
    // Тільки текст питання: жодного документа, фрагмента чи інструмента.
    const turn = await model(SYSTEM, [{ role: 'user', text: q.query }], []);
    const ms = performance.now() - start;
    latencies.push(ms);
    total = addUsage(total, turn.usage);

    const short = turn.text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim().slice(0, 160);
    rows.push(`| ${q.id} | ${q.tags.join(', ')} | ? | ${short} | ${Math.round(ms)} мс |`);
    raw.push(JSON.stringify({ id: q.id, answer: turn.text, usage: turn.usage, latencyMs: Math.round(ms) }));
    console.error(`  ${q.id}: ${Math.round(ms)} мс`);
  }

  // Повні відповіді — щоб вердикти можна було перевірити, а не повірити на слово.
  const rawFile = 'docs/lab2/baseline-answers.jsonl';
  writeFileSync(rawFile, `${raw.join('\n')}\n`, 'utf8');

  console.log(`- Дата зняття: ${new Date().toISOString().slice(0, 10)}`);
  console.log(`- Модель і провайдер: ${name} (${target})`);
  console.log(`- Запитів: ${queries.length}; повні відповіді: ${rawFile}`);
  console.log(`- Промпт дослівно: «${SYSTEM}»\n`);
  console.log('| id | tags | вердикт | що відповіла модель (коротко) | затримка |');
  console.log('|---|---|---|---|---|');
  console.log(rows.join('\n'));
  console.log(`\nТокени (вхід / вихід, сумарно): ${total.inputTokens} / ${total.outputTokens}`);
  console.log(`Вартість прогону за прайсом: $${priceUsd(spec, total).toFixed(6)}`);
  console.log(`Медіана затримки: ${(median(latencies) / 1000).toFixed(2)} с`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});