# Ручна розмітка для калібрування верифікатора

Розмічено вручну 2026-11-14, до запуску верифікатора. Правило — як у промпті судді:
pass — зміна сама показує виконання критерію; fail — зміна ламає критерій; unknown — у diff недостатньо даних.


| Випадок | Зміна | A1 | A2 | A3 | A4 | A5 | A6 |
|---|---|---|---|---|---|---|---|
| 01 | `ffe5ce9` специфікація | unknown | unknown | unknown | unknown | unknown | unknown |
| 02 | `c5289cf` валідатор + CI | unknown | unknown | unknown | unknown | unknown | unknown |
| 03 | `834414d` валідатор у неблокуючому job | pass | unknown | unknown | unknown | unknown | unknown |
| 04 | `8e8a916` заморожений набір | pass | unknown | unknown | unknown | unknown | unknown |
| 05 | `5e20c70` базова лінія | unknown | pass | unknown | unknown | unknown | unknown |
| 06 | `fd198e1` субагенти | unknown | unknown | unknown | unknown | unknown | unknown |
| 07 | `4493bc4` subagents.md | unknown | unknown | unknown | unknown | unknown | unknown |
| 08 | `f1e4d3d` measure-loop (Лаб. 1) | unknown | unknown | unknown | unknown | unknown | unknown |
| 09 | штучна: знижено пороги валідатора | fail | unknown | unknown | unknown | unknown | unknown |
| 10 | штучна: прибрано 3 рядки baseline.md | unknown | fail | unknown | unknown | unknown | unknown |

## Пояснення до неочевидних клітинок

- **02, A1 — unknown:** зміна додає валідатор із порогами 20/3/2 і крок у CI, але самого набору `queries.jsonl` у diff немає — не видно, чи він проходить.
- **03, A1 — pass:** у diff є всі 22 запити (4 `unanswerable`, 3 `injection`) — пороги виконано. Те, що крок валідатора стоїть у неблокуючому job `e2e`, жоден критерій A1–A6 прямо не забороняє — тому не `fail`. Це прогалина рубрики, а не зміни.
- **05, A1 — unknown:** `eval-set.md` лише описує набір («22 запити»); самого `queries.jsonl` у зміні немає.
- **05, A2 — pass:** у `baseline.md` таблиця вердиктів на 22 рядки — стільки ж, скільки запитів.
- **09, A1 — fail:** пороги знижено до 10/1/0 — валідатор пропустить набір, що не відповідає A1.
- **10, A2 — fail:** у таблиці вердиктів 19 рядків замість 22.
- **A3–A6 — усюди unknown:** пошуку, `eval-report.md`, `tests/retrieval.test.ts` і MCP-сервера ще немає, а статус CI в diff не видно.