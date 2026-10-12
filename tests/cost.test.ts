import { describe, expect, it } from 'vitest';
import {
  addUsage,
  costTableRow,
  errorPct,
  fromChatUsage,
  fromGeminiUsage,
  fromMessagesUsage,
  languageMultiplier,
  priceUsd,
  withinTolerance,
  ZERO_USAGE,
} from '../src/cost';
import { estimateCost, specFor } from '../src/models';

describe('cost.ts — нормалізація токенів і розрахунок вартості', () => {
  it('addUsage правильно сумує використання', () => {
    const a = { inputTokens: 100, cachedTokens: 20, outputTokens: 50 };
    const b = { inputTokens: 50, cachedTokens: 10, outputTokens: 25 };
    expect(addUsage(a, b)).toEqual({ inputTokens: 150, cachedTokens: 30, outputTokens: 75 });
    expect(addUsage(ZERO_USAGE, a)).toEqual(a);
  });

  it('fromMessagesUsage додає кешовані до input_tokens', () => {
    const usage = fromMessagesUsage({
      input_tokens: 100,
      cache_read_input_tokens: 40,
      cache_creation_input_tokens: 10,
      output_tokens: 30,
    });
    expect(usage).toEqual({
      inputTokens: 150,
      cachedTokens: 40,
      outputTokens: 30,
    });
  });

  it('fromChatUsage не дублює prompt_tokens', () => {
    const usage = fromChatUsage({
      prompt_tokens: 200,
      completion_tokens: 50,
      prompt_tokens_details: { cached_tokens: 60 },
    });
    expect(usage).toEqual({
      inputTokens: 200,
      cachedTokens: 60,
      outputTokens: 50,
    });
  });

  it('fromGeminiUsage враховує thoughtsTokenCount як вихід', () => {
    const usage = fromGeminiUsage({
      promptTokenCount: 500,
      cachedContentTokenCount: 150,
      candidatesTokenCount: 80,
      thoughtsTokenCount: 20,
    });
    expect(usage).toEqual({
      inputTokens: 500,
      cachedTokens: 150,
      outputTokens: 100,
    });
  });

  it('errorPct та withinTolerance коректно рахують похибку', () => {
    expect(() => errorPct(100, 0)).toThrow(RangeError);
    expect(errorPct(105, 100)).toBeCloseTo(5);
    expect(withinTolerance(108, 100)).toBe(true);
    expect(withinTolerance(115, 100)).toBe(false);
  });

  it('languageMultiplier вираховує співвідношення токенів', () => {
    expect(() => languageMultiplier(150, 0)).toThrow(RangeError);
    expect(languageMultiplier(180, 100)).toBeCloseTo(1.8);
  });

  it('priceUsd збігається з estimateCost для ролі', () => {
    // Використовуємо specFor замість CATALOG.find
    const spec = specFor('balanced');
    expect(spec).toBeDefined();

    const usage = { inputTokens: 10_000, cachedTokens: 0, outputTokens: 2_000 };
    const calculated = priceUsd(spec, usage);
    const estimated = estimateCost('balanced', 10_000, 2_000);

    expect(calculated).toBeCloseTo(estimated, 6);
  });

  it('costTableRow генерує коректний рядок таблиці', () => {
    const row = costTableRow({
      run: 'тест',
      provider: 'google',
      model: 'gemini-3.8-flash',
      usage: { inputTokens: 1000, cachedTokens: 0, outputTokens: 200 },
      estimatedInput: 1050,
      actualUsd: 0,
      listUsd: 0.0005,
      latencyMs: 450,
      date: '2026-10-15',
    });
    expect(row).toContain('| тест | google | gemini-3.8-flash | 1000 | 0 | 200 | 1050 | 5.0 | 0.000000 | 0.000500 | 450 | 2026-10-15 |');
  });
});