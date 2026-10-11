# Впевнені помилки — Лабораторна 1

## Плани: задача /api/health

| Інструмент | Режим | Файли, які збирався чіпати | Чим збирався довести | Збігається з контрактом? |
|---|---|---|---|---|
| OpenCode 1.18.35, Big Pickle | Plan | `app/api/health/route.ts` (створити) | Перша версія: `npm test -- tests/health.test.ts`, `typecheck`, `lint`; про `build` лише спитав. Після виправлення: повний `npm test`, `typecheck`, `lint`, `build` (має бути `ƒ /api/health`), порожній `git diff` контракту | Так, але перша версія імпортувала схему через `@/src/health` |
| GitHub Copilot CLI 1.0.95, Auto (gpt-6-luna) | plan | `app/api/health/route.ts` (створити) | Перша версія: `npm test -- tests/health.test.ts` і `typecheck && lint && test`. Після уточнення додано `build` (`ƒ`) і порожній `git diff` контракту | Так, схему в маршруті не імпортував |

## Помилки

| # | Інструмент | Режим | Що запропоновано / заявлено | Що насправді (executed) | Чому це помилка | Як спіймали | Рядок журналу |
|---|---|---|---|---|---|---|---|
| 1 | OpenCode | Plan | Імпорт схеми в маршруті як `'@/src/health'` | Не виконано: виправлено до схвалення. У фінальному `route.ts` відносний імпорт | `tsconfig.json` знає аліас `@/*`, а `vitest.config.ts` ні: `typecheck` проходить, `npm test` падає з `Cannot find package '@/src/health'` | читання плану | [opencode.jsonl#L119](https://github.com/Viakaa/AC_Lab_1/blob/e6d9c193a1c44c0101a978eee77944eacd704600/.agent-log/opencode.jsonl#L119) · 2026-10-11T09:09:05.569Z · read (агент читає `vitest.config.ts`) |
| 2 | OpenCode | Plan | План без `build` і без перевірки, що контракт не змінено | Після моєї підказки додано обидві перевірки; у реалізації агент справді їх запустив | Без `build` не видно, що маршрут статичний (`○`), а `timestamp` застигає | читання плану | [opencode.jsonl#L123](https://github.com/Viakaa/AC_Lab_1/blob/ab2e79c4119e1527a49080c69e3e827ed36c411d/.agent-log/opencode.jsonl#L123) · 2026-10-11T09:09:10.099Z · glob (остання дія перед показом плану) |
| 3 | Copilot | plan | План без `build` і без `git diff` контракту | Після уточнення план доповнено, реалізація пройшла всі перевірки | Те саме: готовність недоведена до кінця | читання плану | [copilot.jsonl#L16](https://github.com/Viakaa/AC_Lab_1/blob/b29fe31a7065b5df52d2535c40742670e85df505/.agent-log/copilot.jsonl#L16) · 2026-10-11T09:27:44.900Z · apply_patch (імовірно, створення першої версії `plan.md`) |
| 4 | Copilot | plan | Режим плану, який має лише читати | `apply_patch` виконано двічі, `files` у журналі порожній. Другий виклик збігається за часом із записом `plan.md` у `~\.copilot\session-state\…`, поза репозиторієм | Plan-режим може писати. У нашому прогоні лише у власну службову теку, `git status` у репозиторії чистий | журнал, `LastWriteTime` файлу `plan.md` | [copilot.jsonl#L20](https://github.com/Viakaa/AC_Lab_1/blob/b29fe31a7065b5df52d2535c40742670e85df505/.agent-log/copilot.jsonl#L20) · 2026-10-11T17:28:52.687Z · apply_patch |

## Що перевірено і не підтвердилося

- **«Готово» без доказу.** У жодного інструмента. OpenCode після `write` (L125) запустив `npm test`, `typecheck`, `lint`, `build` і `git diff` ([L126-L130](https://github.com/Viakaa/AC_Lab_1/blob/ab2e79c4119e1527a49080c69e3e827ed36c411d/.agent-log/opencode.jsonl#L126-L130)). Copilot запустив ті самі перевірки перед `task_complete` ([L26-L33](https://github.com/Viakaa/AC_Lab_1/blob/b29fe31a7065b5df52d2535c40742670e85df505/.agent-log/copilot.jsonl#L26-L33)).
- **Зміна контракту.** `git diff main -- tests/health.test.ts src/health.ts` порожній в обох гілках.
- **Статичний маршрут.** У збірці обох реалізацій `ƒ /api/health`.
- **Не рахую помилками:** перші спроби на порожньому контракті й помилка 403 від OpenCode Zen. Це проблеми середовища, а не агентів.