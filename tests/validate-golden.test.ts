import { describe, expect, it } from 'vitest';
import { SUBMISSION_LIMITS, validateGolden } from '../scripts/validate-golden';

const LOW = { total: 1, unanswerable: 0, injection: 0 };

const row = (override: Record<string, unknown> = {}): string =>
  JSON.stringify({
    id: 'q-01',
    query: 'How long is the default test timeout?',
    expected: ['30 seconds'],
    must_cite: ['doc-13'],
    tags: ['easy'],
    ...override,
  });

describe('validateGolden', () => {
  it('приймає коректний рядок', () => {
    const r = validateGolden(row(), LOW);
    expect(r.problems).toEqual([]);
    expect(r.count.total).toBe(1);
  });

  it('відхиляє порожній must_cite поза unanswerable', () => {
    const r = validateGolden(row({ must_cite: [] }), LOW);
    expect(r.problems.join('\n')).toContain('must_cite не може бути порожнім');
  });

  it('відхиляє unanswerable з непорожнім must_cite', () => {
    const r = validateGolden(row({ tags: ['unanswerable'] }), LOW);
    expect(r.problems.join('\n')).toContain('має бути порожнім');
  });

  it('приймає unanswerable з порожнім must_cite', () => {
    const r = validateGolden(row({ tags: ['unanswerable'], must_cite: [] }), LOW);
    expect(r.problems).toEqual([]);
  });

  it('ловить повтор id', () => {
    const r = validateGolden([row(), row()].join('\n'), LOW);
    expect(r.problems.join('\n')).toContain('повторюється');
  });

  it('ловить витік відповіді в запит', () => {
    const r = validateGolden(
      row({
        query: 'Is it npx playwright show-report that opens the report?',
        expected: ['npx playwright show-report'],
      }),
      LOW,
    );
    expect(r.problems.join('\n')).toContain('дослівно входить у запит');
  });

  it('не вважає витоком короткий факт', () => {
    const r = validateGolden(row({ query: 'Is 30 seconds the default?' }), LOW);
    expect(r.problems).toEqual([]);
  });

  it('відхиляє зайві поля та невідомі теги', () => {
    expect(validateGolden(row({ extra: 1 }), LOW).problems.length).toBeGreaterThan(0);
    expect(validateGolden(row({ tags: ['medium'] }), LOW).problems.length).toBeGreaterThan(0);
  });

  it('відхиляє не-JSON', () => {
    expect(validateGolden('{не json', LOW).problems.join('\n')).toContain('не є коректним JSON');
  });

  it('вимагає пороги подання', () => {
    const r = validateGolden(row(), SUBMISSION_LIMITS);
    const text = r.problems.join('\n');
    expect(text).toContain('потрібно ≥ 20');
    expect(text).toContain('потрібно ≥ 3');
    expect(text).toContain('потрібно ≥ 2');
  });

  it('переживає CRLF і BOM', () => {
    const text = '\uFEFF' + [row({ id: 'q-01' }), row({ id: 'q-02' })].join('\r\n') + '\r\n';
    const r = validateGolden(text, { total: 2, unanswerable: 0, injection: 0 });
    expect(r.problems).toEqual([]);
    expect(r.count.total).toBe(2);
  });
});