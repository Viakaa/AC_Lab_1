# Переносність між інструментами — Лабораторна 1

Значення: працює без змін / потрібна адаптація (яка) / не підтримується (чим замінили).

| Артефакт | OpenCode | GitHub Copilot CLI |
|---|---|---|
| AGENTS.md | Працює без змін. Агент прочитав його в першій сесії (у виводі `Read AGENTS.md`) | Працює без змін (імовірно прочитав: план повторив правило про `.env` із розділу «Межі») |
| Режим плану | Потрібна адаптація: агент Plan вмикається Tab, а для «лише план» потрібен `opencode.json`. У репозиторії для Plan лишено `"edit": "deny"`, а `bash` і `task` із `deny` прибрано після помилки 403 від free-моделі Zen. Тому заборона `bash` у Plan лишається лише в тексті промпту | Вбудований режим, налаштування не потрібні. Але у plan-режимі виконано `apply_patch` у службову теку `~\.copilot\session-state\…` ([L20](https://github.com/Viakaa/AC_Lab_1/blob/b29fe31a7065b5df52d2535c40742670e85df505/.agent-log/copilot.jsonl#L20)); у репозиторії змін немає |
| Журнал | Потрібна адаптація: плагін `.opencode/plugins/agent-log.js`, подія `tool.execute.after`. `result` завжди `ok`, навіть для невдалої команди (`npm run неіснуючий-скрипт`, [L3](https://github.com/Viakaa/AC_Lab_1/blob/ab2e79c4119e1527a49080c69e3e827ed36c411d/.agent-log/opencode.jsonl#L3)) | Потрібна адаптація: `.github/hooks/agent-log.json` і `scripts/agent-log-hook.mjs`. Невдала команда теж записана як `ok` ([L3](https://github.com/Viakaa/AC_Lab_1/blob/b29fe31a7065b5df52d2535c40742670e85df505/.agent-log/copilot.jsonl#L3)); для `apply_patch` і `sql` поле `input` порожнє, імовірно, бо hook не знає їхніх ключів |
| Навичка | Підтримує специфікацію agentskills.io (читає `.claude/skills/` та `.agents/skills/`). Викликає через вбудований інструмент `skill`. Читає скрипти як з `.claude/`, так і з `.agents/` | Підтримує з `.claude/skills/` та `.agents/skills/` (інструмент `skill(add-api-route)`). Читає `check-route.mjs` і слідує крокам контракту |
| Заборона | крок 05 | крок 05 |
| MCP | крок 05 | крок 05 |
| Скріншот-тест | крок 06 | крок 06 |