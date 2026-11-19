# Підключення MCP-сервера

## Бік 1 — агент кодування
- Який агент і версія: OpenCode 1.19.0, модель Big Pickle (OpenCode Zen)
- Чому саме він: шлях за $0 — Claude Code і Codex CLI потребують платного плану; OpenCode у мене вже налаштований з Лаб. 1 (журнал дій, guard `.env`, субагенти кроку 02) і вже має один MCP-сервер (context7)
- Де лежить конфігурація: [`opencode.json`](../../opencode.json) у корені репозиторію (комітиться)
- Конфігурація дослівно (секретів немає — серверу вони не потрібні):
```json
"lab2-corpus": {
  "type": "local",
  "command": ["npx", "tsx", "src/mcp/server.ts"],
  "enabled": true,
  "environment": { "MCP_CLIENT_LABEL": "opencode" },
  "timeout": 15000
}
```
- Перевірка підключення: `/mcp` у сесії OpenCode → `lab2-corpus` connected
- Що викликано (сесія `ses_e09e334b6ffebsqKY9eFCqY1If`, 2026-11-19 23:20 UTC):
  - `lab2-corpus_fetch_chunk {id: "doc-13#0001"}` → текст фрагмента «Test timeout … 30 seconds by default»
  - `lab2-corpus_search_corpus {query: "What is the default test timeout in Playwright?", topK: 3}` → `doc-13#0001` (cosine 0,9013), `doc-13#0009`, `doc-13#0002`
  - `lab2-corpus_fetch_chunk {id: "doc-99#0000"}` → відмова «фрагмента doc-99#0000 немає в індексі»
- Доказ: транскрипт [traces/mcp-opencode.md](traces/mcp-opencode.md); три рядки `"source":"opencode"` у [traces/mcp-calls.jsonl](traces/mcp-calls.jsonl) (третій — `"result":"refused"`); рядки L275–L276 у `.agent-log/opencode.jsonl`

## Бік 2 — застосунок
- Де код клієнта: [`scripts/mcp-demo.ts`](../../scripts/mcp-demo.ts) — `@modelcontextprotocol/client` 2.4.0, `StdioClientTransport`
- Команда запуску: `npx tsx scripts/mcp-demo.ts` (Ollama запущена)
- Оточення сервера: `getDefaultEnvironment()` + `MCP_CLIENT_LABEL=lab2-app` — НЕ `...process.env`, щоб сервер не отримав секретів застосунку
- Що викликано (2026-11-19 23:23 UTC): `listTools` (2 інструменти) → `search_corpus` («What is the default test timeout in Playwright?», topK 3) → `fetch_chunk doc-13#0001` → `fetch_chunk doc-99#0000` (за межею — відмова, `isError: true`)
- Доказ: вивід команди [traces/mcp-app.txt](traces/mcp-app.txt); три рядки `"source":"lab2-app"` у [traces/mcp-calls.jsonl](traces/mcp-calls.jsonl)

Зведення журналу сервера (`Group-Object source, tool`):

| source | fetch_chunk | search_corpus | з них відмов |
|---|---|---|---|
| opencode | 2 | 1 | 1 |
| lab2-app | 2 | 1 | 1 |
| unknown (Inspector, крок 08) | 2 | 1 | 2 |

## Що зламалося з першого разу
| Що саме | На якому боці | Причина | Що змінила в сервері чи конфігурації |
|---|---|---|---|
| Виклики з Inspector записані з `source: unknown` | Inspector (крок 08) | Inspector запускає сервер підпроцесом зі своїм обмеженим оточенням; `$env:MCP_CLIENT_LABEL` з PowerShell до сервера не доходить | мітку `source` задаю в конфігурації клієнта: `environment` в `opencode.json`, `env` у `StdioClientTransport` |
| Відмову (`doc-99#0000`) не записав журнал агента | OpenCode | плагін `.opencode/plugins/agent-log.js` пише в хуку `tool.execute.after`, а на результат з `isError` той не спрацював — у `.agent-log/opencode.jsonl` лише 2 рядки з 3 | у коді нічого; повний доказ — журнал самого сервера `mcp-calls.jsonl`, де відмова є |

Запобіжно, до першого запуску: таймаут отримання списку інструментів в OpenCode піднято з типових 5000 до 15 000 мс — на старті сервер завантажує індекс 4,3 МБ і будує BM25, а `npx tsx` на Windows стартує кілька секунд. З 5000 мс не перевіряла.

## Чим відрізняються два боки
- Робоча тека і оточення: OpenCode запускає сервер із теки, звідки запущено `opencode .` (корінь репозиторію), з власними змінними плюс `environment`; застосунок — з поточної теки й лише з `getDefaultEnvironment()` + мітка. Відносний шлях `src/mcp/server.ts` в обох конфігураціях читається від робочої теки, тому обидва клієнти треба запускати з кореня репозиторію; усередині сервера шляхи до `data/index.json` і журналу беруться від `import.meta.url`, тож від теки не залежать
- `npx` на Windows: у застосунку `spawn npx` не впав, бо `@modelcontextprotocol/client` запускає процес через `cross-spawn`, який знаходить `npx.cmd`
- Таймаути: сервер — 10 с на обробник (`LIMITS.timeoutMs`); OpenCode — 15 000 мс на список інструментів (моє значення); клієнт SDK — 60 000 мс на запит (`DEFAULT_REQUEST_TIMEOUT_MSEC`); Inspector — типові. Серверний таймаут менший за клієнтські, тож при зависанні ембедера клієнт отримає мою відмову «перевищено таймаут 10000 мс», а не власну помилку очікування
- Що зафіксувала в mcp-spec.md як вимогу: мітка викликача задається в конфігурації клієнта; клієнти запускаються з кореня репозиторію; серверний таймаут (10 с) менший за клієнтські

## Секрети
- Жодного значення ключа в закомічених конфігураціях: серверу ключі не потрібні (індекс закомічений, Ollama локальна); у `opencode.json` і `scripts/mcp-demo.ts` немає ні ключів, ні посилань на них; застосунок не передає серверу `process.env`
- Де насправді лежать ключі: `.env.local` поза git (`git ls-files .env .env.local` — порожньо); у репозиторії — `.env.example` без значень