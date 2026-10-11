# Тест на спрацювання навички — Лабораторна 1

Навичка: `add-api-route`  
Розташування: `.claude/skills/add-api-route/` (джерело), `.agents/skills/add-api-route/` (копія).

## Запити

### Позитивні (має спрацювати: +)
1. `P1`: «Додай ендпоінт GET /api/version, який повертає версію додатка з package.json»
2. `P2`: «Потрібен новий API маршрут /api/echo для перевірки тіла POST-запиту»
3. `P3`: «Створи HTTP-обробник GET /api/ping для перевірки доступності сервісу»

### Негативні (не має спрацювати: -)
4. `N1`: «Онови дизайн головної сторінки в app/page.tsx: додай кнопку повернення назад»
5. `N2`: «Виправ конфігурацію vitest.config.ts, щоб покращити покриття тестів»
6. `N3`: «Додай нову залежність lodash у package.json і онови лінтер»

## Результати тестування

| # | Запит | Очікування | OpenCode | Рядок журналу OpenCode | GitHub Copilot CLI | Рядок журналу Copilot |
|---|---|:---:|:---:|---|:---:|---|
| 1 | P1 (/api/version) | + | + | [opencode.jsonl#L131](https://github.com/Viakaa/AC_Lab_1/blob/ee299d0055154cda323da52f8c8bfcb8dcb7b200/.agent-log/opencode.jsonl#L131) · 2026-10-11T18:19:03.275Z · skill | + | [copilot.jsonl#L4](https://github.com/Viakaa/AC_Lab_1/blob/ee299d0055154cda323da52f8c8bfcb8dcb7b200/.agent-log/copilot.jsonl#L4) · 2026-10-11T18:19:56.641Z · skill |
| 2 | P2 (/api/echo) | + | + | [opencode.jsonl#L143](https://github.com/Viakaa/AC_Lab_1/blob/ee299d0055154cda323da52f8c8bfcb8dcb7b200/.agent-log/opencode.jsonl#L143) · 2026-10-11T18:22:52.457Z · skill | + | [copilot.jsonl#L11](https://github.com/Viakaa/AC_Lab_1/blob/ee299d0055154cda323da52f8c8bfcb8dcb7b200/.agent-log/copilot.jsonl#L11) · 2026-10-11T18:23:28.338Z · skill |
| 3 | P3 (/api/ping) | + | + | [opencode.jsonl#L146](https://github.com/Viakaa/AC_Lab_1/blob/ee299d0055154cda323da52f8c8bfcb8dcb7b200/.agent-log/opencode.jsonl#L146) · 2026-10-11T18:24:04.348Z · skill | + | [copilot.jsonl#L15](https://github.com/Viakaa/AC_Lab_1/blob/ee299d0055154cda323da52f8c8bfcb8dcb7b200/.agent-log/copilot.jsonl#L15) · 2026-10-11T18:24:40.908Z · skill |
| 4 | N1 (дизайн сторінки) | - | - | Не викликано: читання `app/page.tsx` | - | Не викликано: читання `app/page.tsx` |
| 5 | N2 (vitest.config) | - | - | Не викликано: читання `vitest.config.ts` | - | Не викликано: пошук `vitest.config.ts` |
| 6 | N3 (lodash / lint) | - | - | Не викликано: читання `package.json` | - | Не викликано: пошук `package.json` / `eslint` |

## Висновки

1. **Точність маршрутизатора:** Опис `description` спрацював зі 100% точністю (3/3 true positives, 0 false positives). Формулювання "Додає API-маршрут... Використовуй, коли просять новий ендпоінт, API-маршрут чи обробник HTTP-запиту. Не використовуй для змін сторінок, компонентів і стилів" однозначно відсікло сторонні задачі.
2. **Синхронізація навичок:** OpenCode у тесті P3 прочитав скрипт саме з копії `.agents\skills\add-api-route\scripts\check-route.mjs` (рядок L147), що довело необхідність регулярної синхронізації через `npm run sync-skills`.
3. **Економія контексту:** Сесії переривалися одразу після активації навички, запобігаючи генерації зайвого коду й витраті токенів.
