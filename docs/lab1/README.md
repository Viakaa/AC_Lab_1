# Пакет доказів · Лабораторна 1

Автор: Бойчук Вікторія, група AI-41

Репозиторій: [Viakaa/AC_Lab_1](https://github.com/Viakaa/AC_Lab_1)

## Інструменти

| Роль | Інструмент | Версія (`<інструмент> --version`) | План або модель |
|---|---|---|---|
| Агент кодування A | OpenCode | `1.19.0` (сесії кроків 00–03 — `1.18.35`, див. [autonomy-log.md](autonomy-log.md)) | OpenCode Zen, модель Big Pickle (безкоштовно) |
| Агент кодування B | GitHub Copilot CLI | `GitHub Copilot CLI 1.0.95.` | Auto (`gpt-6-luna`) |
| Власний цикл, хмара | `src/agent/agent-loop.ts`, `src/agent/agent-aisdk.ts` | — | Google Gemini API free tier, `gemini-3.8-flash` |
| Власний цикл, шлюз | `scripts/measure-loop.ts openrouter` | — | OpenRouter `:free` |
| Власний цикл, локально | `scripts/measure-loop.ts ollama-messages` | Ollama | `qwen2.5-coder:7b` |

## Як запустити у двох інструментах

Спільне для обох: `npm install`, `cp .env.example .env.local` і заповнити ключі. Агенти `.env*` не читають — це блокує hook заборони. Перевірка: `npm run typecheck && npm run lint && npm test`.

### Інструмент A — OpenCode

1. У корені репозиторію запустити `opencode`. Він сам читає `AGENTS.md` і `opencode.json`.
2. Плагіни `.opencode/plugins/agent-log.js` (журнал у `.agent-log/opencode.jsonl`) і `.opencode/plugins/guard-env.js` (заборона `.env*`) підвантажуються автоматично з теки `.opencode/plugins/`.
3. MCP Context7 уже описано в `opencode.json` (секція `mcp`, віддалений URL без ключів).
4. Режим плану: клавіша Tab перемикає агентів Build ↔ Plan.
5. Навичка `add-api-route` береться з `.claude/skills/` або `.agents/skills/` (інструмент `skill`).

### Інструмент B — GitHub Copilot CLI

1. У корені репозиторію запустити `copilot` і довірити теку. CLI читає `AGENTS.md`.
2. Hooks із `.github/hooks/` підхоплюються автоматично: `agent-log.json` → `scripts/agent-log-hook.mjs` (журнал у `.agent-log/copilot.jsonl`), `guard-env.json` → `scripts/guard-env.mjs` (заборона `.env*`, `permissionDecision: "deny"`).
3. MCP Context7 додається в користувацький `~/.copilot/mcp-config.json` або командою `/mcp add` (у репозиторії ключів немає).
4. Режим плану: Shift+Tab перемикає режими (plan / interactive).
5. Навичка `add-api-route` береться з `.claude/skills/` або `.agents/skills/` (інструмент `skill`).

## Прогони CI

- Зелений прогін на main: [run 39144341708](https://github.com/Viakaa/AC_Lab_1/actions/runs/39144341708) · job [«Типи, лінт, тести, збірка»](https://github.com/Viakaa/AC_Lab_1/actions/runs/39144341708/job/117725014035)
- Зелений job «Playwright (не блокує)»: [job 117725173128](https://github.com/Viakaa/AC_Lab_1/actions/runs/39144341708/job/117725173128) (окремо доказ кроку 06: [job 114533057856](https://github.com/Viakaa/AC_Lab_1/actions/runs/38160731529/job/114533057856)) · копія скріншота: [e2e-home.png](e2e-home.png)
- Червоний прогін «поганого патча»: <!-- TODO(Вікторія): посилання на PR викладача і на червоний прогін --> · яка перевірка спрацювала: <!-- TODO -->

## Та сама задача в двох інструментах

Спільний базовий коміт — [ba52fa6](https://github.com/Viakaa/AC_Lab_1/commit/ba52fa6e71612c4bd143205fdcb419bfbda96a20) (контракт `tests/health.test.ts`, червоний до реалізації).

- `lab1/health-opencode`: [гілка](https://github.com/Viakaa/AC_Lab_1/tree/lab1/health-opencode) · порівняння з базовим комітом: [ba52fa6...lab1/health-opencode](https://github.com/Viakaa/AC_Lab_1/compare/ba52fa6...lab1/health-opencode)
- `lab1/health-copilot`: [гілка](https://github.com/Viakaa/AC_Lab_1/tree/lab1/health-copilot) · порівняння з базовим комітом: [ba52fa6...lab1/health-copilot](https://github.com/Viakaa/AC_Lab_1/compare/ba52fa6...lab1/health-copilot)
- У main злито: `lab1/health-opencode`, коміт злиття [8e25451](https://github.com/Viakaa/AC_Lab_1/commit/8e25451ae03955a6e701c49b02c9c4104c516595) (реалізація — [ab2e79c](https://github.com/Viakaa/AC_Lab_1/commit/ab2e79c4119e1527a49080c69e3e827ed36c411d))
- Власний цикл (крок 08): [гілка `lab1/health-loop`](https://github.com/Viakaa/AC_Lab_1/tree/lab1/health-loop)

## Деплой і траси

- Ендпоінт: `https://ac-lab-1-qza1hr2ps-viket2006-5025.vercel.app/api/agent` (POST) · рантайм: Vercel Hobby, Node.js, Next.js route handler [`app/api/agent/route.ts`](../../app/api/agent/route.ts)
- Модель: `gemini-3.8-flash`, інструмент `getTime` (поточний час сервера в ISO 8601)
- Система трасування: Langfuse Cloud Hobby (проєкт `ac-lab-1`) · скріншоти: [traces/](traces/)

| Траса | Запит | Кроки | Токени | Затримка | Вартість | Скріншот |
|---|---|---|---|---|---|---|
| `690fd7848f42d36349b2015f2573f3c7` | «Котра зараз година?» | 2 (`getTime` + відповідь) | 461 | 5.41 s | $0.001 | [trace-1.png](traces/trace-1.png) |
| `d2763f0332bad0b521c5318216ba000b` | «Скільки хвилин лишилось до півночі?» | 2 (`getTime` + обчислення) | 1 185 | 9.21 s | $0.004 | [trace-2.png](traces/trace-2.png) |
| `dc16abccc733e4fd91970d1589fbfbbe` | «Привітайся одним реченням» | 1 (без інструментів) | 119 | 1.86 s | < $0.0003 | [trace-3.png](traces/trace-3.png) |

Список трас: [trace-list.png](traces/trace-list.png).

## Докази за критеріями

| Критерій | Файл або посилання |
|---|---|
| AGENTS.md ≤ 200 рядків, тест 40% | [AGENTS.md](../../AGENTS.md) (33 рядки) · [agents-md-40.md](agents-md-40.md) |
| CLAUDE.md з рядком `@AGENTS.md` | [CLAUDE.md](../../CLAUDE.md) |
| Журнал із двох інструментів | [.agent-log/opencode.jsonl](../../.agent-log/opencode.jsonl), [.agent-log/copilot.jsonl](../../.agent-log/copilot.jsonl) · конфігурація: [.opencode/plugins/agent-log.js](../../.opencode/plugins/agent-log.js), [.github/hooks/agent-log.json](../../.github/hooks/agent-log.json) |
| Впевнені помилки | [confident-errors.md](confident-errors.md) |
| Навичка, обидва розташування, спрацювання | [.claude/skills/add-api-route/](../../.claude/skills/add-api-route/) · [.agents/skills/add-api-route/](../../.agents/skills/add-api-route/) · [skill-trigger.md](skill-trigger.md) |
| Заборона: рядок denied | Copilot: [copilot.jsonl#L29](https://github.com/Viakaa/AC_Lab_1/blob/39fb61c48fab8249591f54347c5f6b009867bb75/.agent-log/copilot.jsonl#L29) (ts `2026-10-11T19:29:24.894Z`, tool `powershell`) · OpenCode: [opencode.jsonl#L160](https://github.com/Viakaa/AC_Lab_1/blob/39fb61c48fab8249591f54347c5f6b009867bb75/.agent-log/opencode.jsonl#L160) (ts `2026-10-11T19:30:54.794Z`, tool `bash`) |
| MCP і ціна контексту | [context-cost.md](context-cost.md) |
| Браузерний тест і скріншот | [tests/health-link.spec.ts](../../tests/health-link.spec.ts) · [e2e-home.png](e2e-home.png) |
| Оцінка токенів, кеш, ua/en, три прогони | [cost.md](cost.md) · [src/cost.ts](../../src/cost.ts) · [tests/cost.test.ts](../../tests/cost.test.ts) |
| Власний цикл і тести | [src/agent/agent-loop.ts](../../src/agent/agent-loop.ts) · [src/agent/adapters.ts](../../src/agent/adapters.ts) · [tests/agent-loop.test.ts](../../tests/agent-loop.test.ts) · [.agent-log/agent-loop.jsonl](../../.agent-log/agent-loop.jsonl) |
| Порівняння «та сама задача» | [comparison.md](comparison.md) |
| SDK і підтвердження дій | [src/agent/agent-aisdk.ts](../../src/agent/agent-aisdk.ts) · [tests/agent-aisdk.test.ts](../../tests/agent-aisdk.test.ts) |
| Деплой і траси | [app/api/agent/route.ts](../../app/api/agent/route.ts) · [instrumentation.ts](../../instrumentation.ts) · [src/otel/langfuse.ts](../../src/otel/langfuse.ts) · [traces/](traces/) |
| Рішення про модель | [model-decision.md](model-decision.md) |
| Переносність | [portability.md](portability.md) |
| Журнал автономності | [autonomy-log.md](autonomy-log.md) |
| Чернетка «Вступу» | [intro-draft.md](intro-draft.md) |
