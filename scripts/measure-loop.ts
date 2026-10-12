import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';

import { createChatAdapter, createMessagesAdapter } from '../src/agent/adapters';
import { runAgentLoop, type Model } from '../src/agent/agent-loop';
import { createTools, jsonlLogger, type LogEntry } from '../src/agent/tools';
import { priceUsd } from '../src/cost';
import { CATALOG, type ModelSpec } from '../src/models';

const ProposalSchema = z.object({
  analysis: z.string().describe('Короткий аналіз структури репозиторію (1 речення)'),
  files: z.array(
    z.object({
      path: z.string().describe('Шлях до файлу'),
      content: z.string().describe('Вміст файлу'),
    }),
  ),
});

const ROOT = process.cwd();
const LOG_FILE = path.join(ROOT, '.agent-log', 'agent-loop.jsonl');
const rawLogger = jsonlLogger(LOG_FILE);

const logger = (entry: LogEntry): void => {
  rawLogger(entry);
  console.log(`  [інструмент] -> ${entry.tool}(${JSON.stringify(entry.input)}) => [${entry.result}]`);
};

function getSpec(modelId: string): ModelSpec {
  const allSpecs = Object.values(CATALOG) as ModelSpec[];
  return (
    allSpecs.find((m) => m.id === modelId || m.id.includes('gemini') || m.id.includes(modelId)) ??
    ({
      id: modelId,
      provider: 'google',
      inputPerMTok: 0.15,
      outputPerMTok: 0.6,
    } as ModelSpec)
  );
}

async function main() {
  const target = process.argv[2] ?? 'ollama-messages';
  const runsCount = Number(process.argv[3] ?? '1');

  let model: Model;
  let modelName = '';

 if (target === 'ollama-messages') {
    modelName = process.env.OLLAMA_MODEL ?? 'qwen3:4b';
    const rawUrl = process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
    const baseUrl = rawUrl.replace('localhost', '127.0.0.1'); // захист від IPv6 бага Windows
    model = createMessagesAdapter({
      url: `${baseUrl}/v1/messages`,
      model: modelName,
    });
  } else if (target === 'gemini') {
    modelName = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY відсутній у .env.local');
    model = createChatAdapter({
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model: modelName,
      apiKey,
    });
  } else if (target === 'ollama-chat') {
    modelName = process.env.OLLAMA_MODEL ?? 'qwen3:4b';
    const baseUrl = process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
    model = createChatAdapter({
      url: `${baseUrl}/v1/chat/completions`,
      model: modelName,
    });
  } else {
    throw new Error(`Невідомий адаптер: ${target}`);
  }

  // Лаконічний промпт для швидкої та гарантованої генерації
 const system =
    'Ти — помічник. Твоє завдання: прочитати тест (максимум 1 виклик read_file) ' +
    'і ВІДРАЗУ надати фінальне рішення для app/api/health/route.ts у вигляді валідного JSON: ' +
    '{"analysis": "одне коротке речення", "files": [{"path": "app/api/health/route.ts", "content": "повний код"}]}. ' +
    'Не викликай додаткових list_files.';

  const task =
    'Прочитай tests/health.test.ts (1 виклик інструмента) і відразу надай готовий код для app/api/health/route.ts у JSON.';

  console.log(`Запуск ${runsCount} прогонів на [${target}] (модель: ${modelName})...\n`);

  let validOutputs = 0;
  const spec = getSpec(modelName);

  for (let i = 1; i <= runsCount; i++) {
    const session = `loop-${randomUUID().slice(0, 8)}`;
    console.log(`--- Початок прогону ${i}/${runsCount} (session: ${session}) ---`);
    const start = performance.now();

    const res = await runAgentLoop({
      model,
      tools: createTools(ROOT),
      system,
      task,
      output: ProposalSchema,
      maxSteps: 8,
      tokenBudget: 30_000,
      session,
      log: logger,
    });

    const latencyMs = performance.now() - start;
    const cost = priceUsd(spec, res.usage);

    if (res.stop === 'done') validOutputs++;

    console.log(
      `Результат ${i}: зупинка=${res.stop} | кроки=${res.steps} | токени=${res.usage.inputTokens}+${res.usage.outputTokens} | ${Math.round(latencyMs / 1000)}с | $${cost.toFixed(6)}\n`,
    );

    if (i === 1 && res.stop === 'done') {
      console.log('--- Перша валідна пропозиція ---');
      console.log(JSON.stringify(res.output, null, 2));
      console.log('-------------------------------\n');
    }
  }

  console.log(`\nВалідних структурованих виходів: ${validOutputs} з ${runsCount}`);
}

main().catch(console.error);