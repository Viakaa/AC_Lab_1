# AGENTS.md

Програма, яка використовує Playwright для тестування, але LLM вирішує, що саме перевірити по ходу тестування і записує баг репорти

## Стек

- TypeScript (strict), Next.js (App Router), Vitest, Playwright.

## Команди

- `npm run doctor` — перевірка середовища та стану агентів
- `npm run dev` — запуск локального застосунку
- `npm test` — тести (Vitest), без мережі.
- `npm run typecheck` — перевірка типів, без емісії.
- `npm run lint` — лінтер.
- `npm run build` — продакшн-збірка.
- Обов'язково перед «готово»: `npm run typecheck && npm run lint && npm test`.
