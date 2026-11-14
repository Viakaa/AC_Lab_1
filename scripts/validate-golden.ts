import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const TAGS = ['easy', 'hard', 'unanswerable', 'injection'] as const;

const Query = z.strictObject({
  id: z.string().min(1),
  query: z.string().min(1),
  expected: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  must_cite: z.array(z.string().regex(/^doc-\d{2}$/)),
  tags: z.array(z.enum(TAGS)).min(1),
});

export type Limits = { total: number; unanswerable: number; injection: number };

/** Пороги подання (на занятті достатньо 10 / 2 / 1). */
export const SUBMISSION_LIMITS: Limits = { total: 20, unanswerable: 3, injection: 2 };

export type GoldenResult = {
  problems: string[];
  count: { total: number; unanswerable: number; injection: number };
};

/** Чиста функція: приймає текст JSONL, повертає перелік проблем. */
export function validateGolden(text: string, limits: Limits = SUBMISSION_LIMITS): GoldenResult {
  const problems: string[] = [];
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const seen = new Set<string>();
  let total = 0;
  let unanswerable = 0;
  let injection = 0;

  lines.forEach((raw, i) => {
    if (raw.trim() === '') return;
    const n = i + 1;

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      problems.push(`рядок ${n}: не є коректним JSON`);
      return;
    }

    const parsed = Query.safeParse(json);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(корінь)'}: ${issue.message}`)
        .join('; ');
      problems.push(`рядок ${n}: невірна схема (${detail})`);
      return;
    }

    const q = parsed.data;
    total += 1;

    if (seen.has(q.id)) problems.push(`рядок ${n}: id ${q.id} повторюється`);
    seen.add(q.id);

    const isUnanswerable = q.tags.includes('unanswerable');
    if (isUnanswerable) unanswerable += 1;
    if (q.tags.includes('injection')) injection += 1;

    if (isUnanswerable && q.must_cite.length > 0) {
      problems.push(`рядок ${n} (${q.id}): для unanswerable must_cite має бути порожнім`);
    }
    if (!isUnanswerable && q.must_cite.length === 0) {
      problems.push(`рядок ${n} (${q.id}): must_cite не може бути порожнім`);
    }

    const facts = Array.isArray(q.expected) ? q.expected : [q.expected];
    const lowerQuery = q.query.toLowerCase();
    for (const fact of facts) {
      if (fact.length >= 12 && lowerQuery.includes(fact.toLowerCase())) {
        problems.push(`рядок ${n} (${q.id}): відповідь «${fact}» дослівно входить у запит`);
      }
    }
  });

  if (total < limits.total) problems.push(`усього запитів ${total}, потрібно ≥ ${limits.total}`);
  if (unanswerable < limits.unanswerable) {
    problems.push(`запитів unanswerable ${unanswerable}, потрібно ≥ ${limits.unanswerable}`);
  }
  if (injection < limits.injection) {
    problems.push(`запитів injection ${injection}, потрібно ≥ ${limits.injection}`);
  }

  return { problems, count: { total, unanswerable, injection } };
}

function main(): void {
  const path = process.argv[2];
  if (!path) {
    console.error('Використання: tsx scripts/validate-golden.ts <queries.jsonl>');
    process.exit(2);
  }
  const { problems, count } = validateGolden(readFileSync(path, 'utf8'));
  console.log(
    `запитів: ${count.total}, unanswerable: ${count.unanswerable}, injection: ${count.injection}`,
  );
  if (problems.length > 0) {
    for (const p of problems) console.error(`✗ ${p}`);
    process.exit(1);
  }
  console.log('✓ набір коректний');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}