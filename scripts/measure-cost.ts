import { readFileSync } from 'node:fs';
import {
  COST_TABLE_HEADER,
  costTableRow,
  fromChatUsage,
  fromGeminiUsage,
  languageMultiplier,
  priceUsd,
  withinTolerance,
} from '../src/cost';
import { CATALOG, type IsoDate, type ModelSpec } from '../src/models';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:4b';
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
const TODAY = new Date().toISOString().slice(0, 10) as IsoDate;

// Модель для хмарного тесту Gemini
const GEMINI_MODEL = 'gemini-3.8-flash';

function getSpec(modelId: string): ModelSpec {
  const allSpecs = Object.values(CATALOG) as ModelSpec[];
  const found = allSpecs.find((m) => m.id === modelId || m.id.includes('gemini'));
  if (found) return found;
  return {
    id: modelId,
    provider: 'google',
    inputPerMTok: 0.15,
    outputPerMTok: 0.6,
  } as ModelSpec;
}

async function geminiCountTokens(model: string, systemPrompt: string, userText: string): Promise<number> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generateContentRequest: {
        model: `models/${model}`,
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
      },
    }),
  });
  if (!res.ok) throw new Error(`countTokens failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { totalTokens: number };
  return data.totalTokens;
}

async function geminiGenerate(model: string, systemPrompt: string, userText: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const start = performance.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
    }),
  });
  const latencyMs = performance.now() - start;
  if (!res.ok) throw new Error(`generateContent failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    usageMetadata: {
      promptTokenCount: number;
      candidatesTokenCount?: number;
      cachedContentTokenCount?: number;
      thoughtsTokenCount?: number;
    };
  };
  return { data, latencyMs };
}

// 1. Оцінка проти факту (Gemini)
// 1. Оцінка проти факту (Gemini)
async function runGeminiMeasurement() {
  if (!GEMINI_API_KEY) {
    console.error('Помилка: GEMINI_API_KEY не знайдено в .env.local');
    process.exit(1);
  }

  const systemPrompt = 'Ви — корисний інженерний асистент курсу Агентна Інженерія. Відповідайте коротко.';
  const userText = 'Поясни різницю між юніт-тестами та e2e браузерними тестами одним реченням.';

  console.log('--- Вимір 1: Gemini Оцінка vs Факт ---');
  console.log(`Використовуємо модель: ${GEMINI_MODEL}`);
  
  console.log('Крок 1: Відправка запиту countTokens...');
  const estimatedInput = await geminiCountTokens(GEMINI_MODEL, systemPrompt, userText);
  console.log(`Отримано оцінку токенів: ${estimatedInput}`);

  console.log('Крок 2: Відправка запиту generateContent...');
  const { data, latencyMs } = await geminiGenerate(GEMINI_MODEL, systemPrompt, userText);
  console.log(`Отримано відповідь за ${Math.round(latencyMs)} мс`);

  const usage = fromGeminiUsage(data.usageMetadata);
  const spec = getSpec(GEMINI_MODEL);

  const row = costTableRow({
    run: 'хмара',
    provider: 'google',
    model: GEMINI_MODEL,
    usage,
    estimatedInput,
    actualUsd: 0,
    listUsd: priceUsd(spec, usage),
    latencyMs,
    date: TODAY,
  });

  console.log('\n' + COST_TABLE_HEADER);
  console.log(row);
  console.log('\nСирий usageMetadata:', JSON.stringify(data.usageMetadata, null, 2));

  const ok = withinTolerance(estimatedInput, usage.inputTokens);
  console.log(`\nВердикт: ${ok ? 'У межах 10% (OK)' : 'ПОНАД 10% (УВАГА)'}`);
}

// 2. Кеш в Ollama
async function runOllamaMeasurement() {
  console.log(`--- Вимір 2: Кеш в Ollama (${OLLAMA_MODEL}) ---`);
  const prefix = 'System instruction:\n' + 'Analyze code safety, reproducibility, and portability in autonomous agents.\n'.repeat(60);
  const payload = (prompt: string) => ({
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: prefix },
      { role: 'user', content: prompt },
    ],
    stream: false,
  });

  const callOllama = async (prompt: string) => {
    const t0 = performance.now();
    const res = await fetch(`${OLLAMA_HOST}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload(prompt)),
    });
    const latency = performance.now() - t0;
    if (!res.ok) throw new Error(`Ollama call failed: ${res.statusText}`);
    return { data: await res.json(), latency };
  };

  console.log('Перший виклик (наповнення кешу)...');
  await callOllama('Привіт! Дай одне коротке слово.');
  console.log('Другий виклик (з тим самим префіксом)...');
  const second = await callOllama('Привіт ще раз! Дай інше слово.');

  const usage2 = fromChatUsage(second.data.usage);
  const spec = getSpec(OLLAMA_MODEL);

  const row = costTableRow({
    run: 'локально',
    provider: 'ollama',
    model: OLLAMA_MODEL,
    usage: usage2,
    actualUsd: 0,
    listUsd: 0,
    latencyMs: second.latency,
    date: TODAY,
  });

  console.log(COST_TABLE_HEADER);
  console.log(row);
  console.log('\nСирий usage другого виклику:', JSON.stringify(second.data.usage, null, 2));
}

// 3. Множник UA / EN
async function runLangMeasurement(filePath: string) {
  const defaultUa = 'Агентна інженерія — це дисципліна, присвячена розробці, налагодженню та моніторингу автономних систем на базі штучного інтелекту. Основна увага приділяється створенню надійних інструментів, контролю витрат токенів та забезпеченню безпеки виконання коду за допомогою захисних перевірок і детального аудиту.';
  const defaultEn = 'Agentic engineering is a discipline dedicated to the development, debugging, and monitoring of autonomous AI-based systems. The main focus is on creating reliable tools, managing token costs, and ensuring code execution security through guardrails and thorough auditing.';

  let uaText = defaultUa;
  let enText = defaultEn;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const uaMatch = /`{2,3}ua[^\r\n]*\r?\n?([\s\S]*?)`{2,3}/.exec(content);
    const enMatch = /`{2,3}en[^\r\n]*\r?\n?([\s\S]*?)`{2,3}/.exec(content);
    if (uaMatch && uaMatch[1]!.trim().length > 10) {
      uaText = uaMatch[1]!.trim().replace(/``n/g, '');
    }
    if (enMatch && enMatch[1]!.trim().length > 10) {
      enText = enMatch[1]!.trim();
    }
  } catch {
    // Якщо файл не прочитався, використовуємо default
  }

  console.log(`--- Вимір 3: Множник ua/en (${GEMINI_MODEL}) ---`);
  console.log('Підрахунок токенів для тексту UA...');
  const uaTokens = await geminiCountTokens(GEMINI_MODEL, '', uaText);
  console.log(`Підрахунок токенів для тексту EN...`);
  const enTokens = await geminiCountTokens(GEMINI_MODEL, '', enText);

  const mult = languageMultiplier(uaTokens, enTokens);
  console.log(`\nТокенів UA: ${uaTokens}`);
  console.log(`Токенів EN: ${enTokens}`);
  console.log(`Множник UA/EN: ${mult.toFixed(2)}x\n`);
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'gemini') {
    await runGeminiMeasurement();
  } else if (mode === 'ollama') {
    await runOllamaMeasurement();
  } else if (mode === 'lang') {
    await runLangMeasurement(process.argv[3] ?? 'docs/lab1/cost.md');
  } else {
    console.log('Використання:');
    console.log('  npx tsx --env-file=.env.local scripts/measure-cost.ts gemini');
    console.log('  npx tsx --env-file=.env.local scripts/measure-cost.ts ollama');
    console.log('  npx tsx --env-file=.env.local scripts/measure-cost.ts lang docs/lab1/cost.md');
  }
}

main().catch(console.error);