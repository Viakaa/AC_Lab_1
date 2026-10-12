import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createChatAdapter, createMessagesAdapter } from '../src/agent/adapters';
import { runAgentLoop, type Model } from '../src/agent/agent-loop';
import { createTools, resolveInside } from '../src/agent/tools';

beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('Мережеві виклики заборонені в тестах');
  });
});

const DummySchema = z.object({ answer: z.string() });


describe('agent-loop — зупинки та поведінка ядра (без мережі)', () => {
  
  it('зупиняється на ліміті кроків (max-steps)', async () => {
    const fakeModel: Model = vi.fn().mockResolvedValue({
      text: '',
      calls: [{ id: '1', name: 'list_files', input: { path: '.' } }],
      usage: { inputTokens: 10, cachedTokens: 0, outputTokens: 10 },
    });

    const res = await runAgentLoop({
      model: fakeModel,
      tools: createTools(process.cwd()),
      system: 'system',
      task: 'task',
      output: DummySchema,
      maxSteps: 3,
      tokenBudget: 100_000,
      session: 'test-session',
      log: vi.fn(),
    });

    expect(res.stop).toBe('max-steps');
    expect(res.steps).toBe(3);
    expect(fakeModel).toHaveBeenCalledTimes(3);
  });

  it('зупиняється на бюджеті токенів (token-budget)', async () => {
    const fakeModel: Model = vi.fn().mockResolvedValue({
      text: '',
      calls: [{ id: '1', name: 'list_files', input: { path: '.' } }],
      usage: { inputTokens: 50, cachedTokens: 0, outputTokens: 50 },
    });

    const res = await runAgentLoop({
      model: fakeModel,
      tools: createTools(process.cwd()),
      system: 'system',
      task: 'task',
      output: DummySchema,
      maxSteps: 100,
      tokenBudget: 150,
      session: 'test-session',
      log: vi.fn(),
    });

    expect(res.stop).toBe('token-budget');
    expect(res.steps).toBe(2);
    expect(fakeModel).toHaveBeenCalledTimes(2);
  });

  it('повертає done, якщо отримано валідний структурований JSON', async () => {
    const fakeModel: Model = vi.fn().mockResolvedValue({
      text: 'Ось відповідь: {"answer": "успіх"}',
      calls: [],
      usage: { inputTokens: 20, cachedTokens: 0, outputTokens: 20 },
    });

    const res = await runAgentLoop({
      model: fakeModel,
      tools: createTools(process.cwd()),
      system: 'system',
      task: 'task',
      output: DummySchema,
      maxSteps: 5,
      tokenBudget: 1000,
      session: 'test-session',
      log: vi.fn(),
    });

    expect(res.stop).toBe('done');
    if (res.stop === 'done') {
      expect(res.output).toEqual({ answer: 'успіх' });
    }
  });

  it('повторює запит, якщо відповідь не відповідає zod схемі', async () => {
    const fakeModel: Model = vi
      .fn()
      .mockResolvedValueOnce({
        text: 'Невалідний JSON: {"wrong_key": 123}',
        calls: [],
        usage: { inputTokens: 20, cachedTokens: 0, outputTokens: 20 },
      })
      .mockResolvedValueOnce({
        text: 'Тепер правильно: {"answer": "виправлено"}',
        calls: [],
        usage: { inputTokens: 20, cachedTokens: 0, outputTokens: 20 },
      });

    const res = await runAgentLoop({
      model: fakeModel,
      tools: createTools(process.cwd()),
      system: 'system',
      task: 'task',
      output: DummySchema,
      maxSteps: 5,
      tokenBudget: 1000,
      session: 'test-session',
      log: vi.fn(),
    });

    expect(res.stop).toBe('done');
    expect(fakeModel).toHaveBeenCalledTimes(2);
  });
});

describe('tools — межі репозиторію та захист', () => {
  it('блокує вихід за межі кореня репозиторію', () => {
    expect(() => resolveInside(process.cwd(), '../outside.txt')).toThrow(/шлях поза репозиторієм/);
  });

  it('блокує спробу читання .env файлів', () => {
    expect(() => resolveInside(process.cwd(), '.env')).toThrow(/секрети агент не читає/);
    expect(() => resolveInside(process.cwd(), '.env.local')).toThrow(/секрети агент не читає/);
    expect(() => resolveInside(process.cwd(), '.env.example')).not.toThrow();
  });
});

describe('adapters — серіалізація та десеріалізація', () => {
  it('Messages адаптер коректно розбирає відповідь', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          { type: 'text', text: 'привіт' },
          { type: 'tool_use', id: 'call_1', name: 'read_file', input: { path: 'file.txt' } },
        ],
        usage: { input_tokens: 15, output_tokens: 10 },
      }),
    });

    const adapter = createMessagesAdapter({ url: 'http://test', model: 'test', fetchFn: mockFetch as unknown as typeof fetch });
    const turn = await adapter('sys', [{ role: 'user', text: 'hi' }], []);

    expect(turn.text).toBe('привіт');
    expect(turn.calls).toHaveLength(1);
    expect(turn.calls[0]!.name).toBe('read_file');
    expect(turn.usage.inputTokens).toBe(15);
  });

  it('Chat адаптер коректно розбирає відповідь', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'hello',
              tool_calls: [
                { id: 'c1', type: 'function', function: { name: 'list_files', arguments: '{"path":"."}' } },
              ],
            },
          },
        ],
        usage: { prompt_tokens: 25, completion_tokens: 12 },
      }),
    });

    const adapter = createChatAdapter({ url: 'http://test', model: 'test', fetchFn: mockFetch as unknown as typeof fetch });
    const turn = await adapter('sys', [{ role: 'user', text: 'hi' }], []);

    expect(turn.text).toBe('hello');
    expect(turn.calls).toHaveLength(1);
    expect(turn.calls[0]!.name).toBe('list_files');
    expect(turn.usage.inputTokens).toBe(25);
  });
});