# Пакет доказів · Лабораторна 2

Репозиторій: [Viakaa/AC_Lab_1](https://github.com/Viakaa/AC_Lab_1) (той самий, що й у Лабораторній 1; `docs/lab1/` не змінювалась після подання Лаб. 1 — коміт `f588695`).
Автор: Бойчук Вікторія. Подано: 2026-11-20. Поданням вважається останній коміт гілки [main](https://github.com/Viakaa/AC_Lab_1/commits/main) до початку заняття 09; README пакета додано в коміті [0d622af](https://github.com/Viakaa/AC_Lab_1/commit/0d622af).

Асистент відповідає на питання про документацію Playwright і Vitest за 23 публічними документами, з гібридним пошуком (вектор + BM25), цитатами `doc-NN#NNNN`, порогом відмови і власним MCP-сервером.

## Висновок
На тому самому еталонному наборі з 22 запитів (SHA `8e8a916`), тій самій моделі `qwen2.5-coder:7b` і тому самому системному промпті додавання гібридного пошуку з k = 5 підняло точність з 2 / 18 (11,1%) до 13 / 18 (72,2%, ± 21 п. п., обчислено), а правильні відмови на запитах без відповіді — з 1 / 4 до 4 / 4; recall@5 = 0,94, MRR@5 = 0,97. Невиконані цілі — у генерації: правильна цитата лише в 38,9% відповідей (ціль ≥ 80%) і одна виконана injection-вказівка (q-17). Перевіряється повторним прогоном `scripts/eval-run.ts` і `--summary`.
Повні числа: [eval-report.md](eval-report.md), розділи «Два числа поруч», «Звірка з вимірюваними цілями» і «Підсумок».

## Докази
| Крок | Доказ | Посилання | Ключові коміти |
|---|---|---|---|
| 00 | Специфікація (набір із походженням і ліцензіями, цілі G1–G7, критерії A1–A6) | [spec.md](spec.md) | [ffe5ce9](https://github.com/Viakaa/AC_Lab_1/commit/ffe5ce9) |
| 01 | Еталонний набір (22 запити, заморожено) | [eval-set.md](eval-set.md), [golden/queries.jsonl](golden/queries.jsonl) | [c5289cf](https://github.com/Viakaa/AC_Lab_1/commit/c5289cf) валідатор, [8e8a916](https://github.com/Viakaa/AC_Lab_1/commit/8e8a916) заморозка |
| 01 | Базова лінія без пошуку | [baseline.md](baseline.md), [baseline-answers.jsonl](baseline-answers.jsonl) | [5e20c70](https://github.com/Viakaa/AC_Lab_1/commit/5e20c70) |
| 02, 07 | Субагенти spec-auditor і explorer, ізоляція, залежності | [subagents.md](subagents.md), [`.opencode/agents/`](../../.opencode/agents/) | [fd198e1](https://github.com/Viakaa/AC_Lab_1/commit/fd198e1), [4493bc4](https://github.com/Viakaa/AC_Lab_1/commit/4493bc4) |
| 03 | Верифікатор на іншій моделі, калібрування 10 випадків, стоп | [verifier.md](verifier.md), [calibration/](calibration/) | [7e86912](https://github.com/Viakaa/AC_Lab_1/commit/7e86912) скрипт, [ecc2d91](https://github.com/Viakaa/AC_Lab_1/commit/ecc2d91) і [5b8b9c3](https://github.com/Viakaa/AC_Lab_1/commit/5b8b9c3) рубрика v2/v3; стоп — гілка [lab2/verifier-stop](https://github.com/Viakaa/AC_Lab_1/tree/lab2/verifier-stop): [2641d4e](https://github.com/Viakaa/AC_Lab_1/commit/2641d4e) червоний, [b842196](https://github.com/Viakaa/AC_Lab_1/commit/b842196) виправлення, [0254a2d](https://github.com/Viakaa/AC_Lab_1/commit/0254a2d) зелений прогін |
| 04 | Індексація: 23 документи → 556 фрагментів, правило 1200/200/120 | [indexing.md](indexing.md) | [352c597](https://github.com/Viakaa/AC_Lab_1/commit/352c597) правило до коду, [509e613](https://github.com/Viakaa/AC_Lab_1/commit/509e613), [b964c35](https://github.com/Viakaa/AC_Lab_1/commit/b964c35) |
| 05 | Гібридний пошук, RRF, цитати, поріг відмови 0,82 | [retrieval.md](retrieval.md) | [c39eb40](https://github.com/Viakaa/AC_Lab_1/commit/c39eb40), [58158e0](https://github.com/Viakaa/AC_Lab_1/commit/58158e0) |
| 06 | Оцінювання поруч із базовою лінією, 6 помилок | [eval-report.md](eval-report.md), [eval-run.json](eval-run.json), [eval-run.diff](eval-run.diff) | [3f3096d](https://github.com/Viakaa/AC_Lab_1/commit/3f3096d), [10aa090](https://github.com/Viakaa/AC_Lab_1/commit/10aa090) прогін з трасою, [fa44e5e](https://github.com/Viakaa/AC_Lab_1/commit/fa44e5e) |
| 07 | Граф залежностей, бюджет, 7 прогонів паралельності, маршрутизація | [budget.md](budget.md), [parallel-run.json](parallel-run.json) | [8f45e8e](https://github.com/Viakaa/AC_Lab_1/commit/8f45e8e) бюджет до запуску, [50644d0](https://github.com/Viakaa/AC_Lab_1/commit/50644d0), [234a162](https://github.com/Viakaa/AC_Lab_1/commit/234a162) |
| 08 | Специфікація MCP-сервера, smoke-тест Inspector | [mcp-spec.md](mcp-spec.md), [traces/mcp-inspector.md](traces/mcp-inspector.md), [verify-mcp.json](verify-mcp.json) | [6309463](https://github.com/Viakaa/AC_Lab_1/commit/6309463) специфікація до коду, [c6ff903](https://github.com/Viakaa/AC_Lab_1/commit/c6ff903) сервер |
| 09 | Підключення сервера до OpenCode і до застосунку | [mcp-integration.md](mcp-integration.md), [traces/mcp-calls.jsonl](traces/mcp-calls.jsonl), [traces/mcp-opencode.md](traces/mcp-opencode.md), [traces/mcp-app.txt](traces/mcp-app.txt) | [00c18e3](https://github.com/Viakaa/AC_Lab_1/commit/00c18e3) |
| — | Журнал автономності (10 сесій) | [autonomy-log.md](autonomy-log.md) | |
| — | Траси (Langfuse): прогін набору, паралельність | [traces/eval-run.png](traces/eval-run.png), [traces/parallel-before.png](traces/parallel-before.png), [traces/parallel-after.png](traces/parallel-after.png) | |

## Код
| Що | Шлях у репозиторії |
|---|---|
| Фрагментація | [`src/rag/chunk.ts`](../../src/rag/chunk.ts) |
| Ембедер, індекс | [`src/rag/embed.ts`](../../src/rag/embed.ts), [`src/rag/store.ts`](../../src/rag/store.ts), [`scripts/build-index.ts`](../../scripts/build-index.ts), [`data/index.json`](../../data/index.json) |
| Пошук і цитати | [`src/rag/bm25.ts`](../../src/rag/bm25.ts), [`src/rag/rrf.ts`](../../src/rag/rrf.ts), [`src/rag/search.ts`](../../src/rag/search.ts), [`src/rag/cite.ts`](../../src/rag/cite.ts), [`scripts/search.ts`](../../scripts/search.ts), [`scripts/ask.ts`](../../scripts/ask.ts) |
| Оцінювання | [`src/metrics.ts`](../../src/metrics.ts), [`scripts/baseline.ts`](../../scripts/baseline.ts), [`scripts/eval-run.ts`](../../scripts/eval-run.ts), [`scripts/parallel-eval.ts`](../../scripts/parallel-eval.ts), [`src/otel/run-tracing.ts`](../../src/otel/run-tracing.ts) |
| Верифікатор | [`src/verify/schema.ts`](../../src/verify/schema.ts), [`scripts/verify.ts`](../../scripts/verify.ts), [`scripts/validate-golden.ts`](../../scripts/validate-golden.ts) |
| MCP-сервер і клієнт | [`src/mcp/tools.ts`](../../src/mcp/tools.ts), [`src/mcp/server.ts`](../../src/mcp/server.ts), [`scripts/mcp-demo.ts`](../../scripts/mcp-demo.ts), [`opencode.json`](../../opencode.json) |
| Тести (без мережі, у CI) | [`tests/chunk.test.ts`](../../tests/chunk.test.ts), [`tests/index.test.ts`](../../tests/index.test.ts), [`tests/retrieval.test.ts`](../../tests/retrieval.test.ts), [`tests/metrics.test.ts`](../../tests/metrics.test.ts), [`tests/mcp.test.ts`](../../tests/mcp.test.ts), [`tests/validate-golden.test.ts`](../../tests/validate-golden.test.ts), [`tests/verify-schema.test.ts`](../../tests/verify-schema.test.ts) |

## Прогони CI
- Зелений на main: [run 44637664562](https://github.com/Viakaa/AC_Lab_1/actions/runs/44637664562) — job [«Типи, лінт, тести, збірка»](https://github.com/Viakaa/AC_Lab_1/actions/runs/44637664562/job/135960265228) success (коміт `f075376`); job «Playwright (не блокує)» — `continue-on-error`
- Зміну, яку не пропустив верифікатор, зупинено локальною брамою `npm run verify` (у CI верифікатор не запускається — CI без ключів): гілка [lab2/verifier-stop](https://github.com/Viakaa/AC_Lab_1/tree/lab2/verifier-stop), коміт [2641d4e](https://github.com/Viakaa/AC_Lab_1/commit/2641d4e), звіт [verify-stop-red.json](https://github.com/Viakaa/AC_Lab_1/blob/lab2/verifier-stop/docs/lab2/verify-stop-red.json)

## Інструменти й моделі
| Роль | Інструмент / модель | Версія |
|---|---|---|
| Агент кодування (субагенти, MCP-клієнт) | OpenCode · Big Pickle (OpenCode Zen) | 1.19.0 |
| Код Лаб. 2 (скрипти, тести; давав у чаті, вставляла я) | Claude Code · Claude Opus 5.5 | — |
| Чернетка специфікації | Claude (чат) · Claude Sonnet 5.5 | — |
| Верифікатор | OpenRouter · `nvidia/nemotron-3-ultra-550b-a55b:free` | — |
| Ембедер | Ollama · `embeddinggemma-2:270m` (768 вимірів) | Ollama 0.40.16 |
| Модель відповідей (базова лінія і пошук) | Ollama · `qwen2.5-coder:7b` | Ollama 0.40.16 |
| AI SDK | `ai` | 7.0.138 |
| MCP | `@modelcontextprotocol/server`, `@modelcontextprotocol/client`; Inspector | 2.4.0; 2.13.0 |
| Траси | Langfuse Cloud (Hobby), `@langfuse/otel` | 5.13.1 |
| Рантайм | Node.js, TypeScript | 24.20.0, 6.0.3 |

## Як відтворити
Потрібні Node.js ≥ 22 і запущена Ollama.

1. Залежності й моделі:
   ```
   npm install
   ollama pull embeddinggemma-2:270m
   ollama pull qwen2.5-coder:7b
   ```
2. Індексація (≈ 5–8 хв на CPU; результат збігається з закоміченим `data/index.json`):
   ```
   npm run index
   ```
3. Пошук і відповідь із цитатами:
   ```
   npx tsx scripts/search.ts "How long can a single Playwright test run before it times out by default?" --explain
   npx tsx scripts/ask.ts "How long can a single Playwright test run before it times out by default?"
   ```
4. MCP-сервер: запуск, smoke-тест і клієнт застосунку:
   ```
   npm run mcp
   npx @modelcontextprotocol/inspector --cli npx tsx src/mcp/server.ts --protocol-era modern --method tools/list --format json
   npx tsx scripts/mcp-demo.ts
   ```
5. Тести (без мережі й ключів):
   ```
   npm run typecheck && npm run lint && npm test
   ```
6. Оцінювання й підсумок:
   ```
   npx tsx --env-file=.env.local scripts/eval-run.ts docs/lab2/golden/queries.jsonl ollama-messages
   npx tsx scripts/eval-run.ts --summary docs/lab2/eval-run.json
   ```
   Без ключів Langfuse у `.env.local` прогін працює, лише без трас; вердикти в новому `eval-run.json` ставить людина за правилом з `baseline.md`.