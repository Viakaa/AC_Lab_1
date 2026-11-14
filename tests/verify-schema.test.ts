import { describe, expect, it } from 'vitest';

import { isBlocked, verifyReport, type CriterionVerdict } from '../src/verify/schema';

const ok: CriterionVerdict = { id: 'A1', verdict: 'pass', reason: 'Набір має 22 запити.', evidence: 'docs/lab2/golden/queries.jsonl:1-22' };

describe('verifyReport', () => {
  it('приймає коректний звіт', () => {
    expect(verifyReport.safeParse({ results: [ok] }).success).toBe(true);
  });

  it('відкидає невідомий вердикт', () => {
    expect(verifyReport.safeParse({ results: [{ ...ok, verdict: 'maybe' }] }).success).toBe(false);
  });

  it('відкидає зайві поля (строга схема)', () => {
    expect(verifyReport.safeParse({ results: [{ ...ok, score: 10 }] }).success).toBe(false);
  });

  it('відкидає порожній звіт', () => {
    expect(verifyReport.safeParse({ results: [] }).success).toBe(false);
  });
});

describe('isBlocked', () => {
  it('fail блокує', () => {
    expect(isBlocked({ results: [ok, { ...ok, id: 'A2', verdict: 'fail' }] })).toBe(true);
  });

  it('unknown не блокує', () => {
    expect(isBlocked({ results: [ok, { ...ok, id: 'A2', verdict: 'unknown', evidence: '' }] })).toBe(false);
  });
});