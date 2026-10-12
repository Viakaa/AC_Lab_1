/**
 * Адаптери двох форм API (крок 08):
 * 1. Messages-форма (Anthropic / Ollama /v1/messages)
 * 2. Chat Completions-форма (OpenAI / Gemini / Ollama /v1/chat/completions)
 */
import { fromChatUsage, fromMessagesUsage } from '../cost';
import type { Message, Model, ModelTurn, ToolCall } from './agent-loop';
import type { AgentTool } from './tools';

export interface AdapterOptions {
  readonly url: string;
  readonly model: string;
  readonly apiKey?: string;
  readonly fetchFn?: typeof fetch;
}

/** Адаптер форми Messages (Anthropic / Ollama /v1/messages) */
export function createMessagesAdapter(opts: AdapterOptions): Model {
  const fetchFn = opts.fetchFn ?? fetch;

  return async (system: string, messages: readonly Message[], tools: readonly AgentTool[]): Promise<ModelTurn> => {
    const rawFormatted: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];

    for (const m of messages) {
      if (m.role === 'user') {
        rawFormatted.push({ role: 'user', content: m.text });
      } else if (m.role === 'assistant') {
        const content: unknown[] = [];
        if (m.text) content.push({ type: 'text', text: m.text });
        for (const c of m.calls) {
          content.push({ type: 'tool_use', id: c.id, name: c.name, input: c.input });
        }
        // Захист: Anthropic API та Ollama падають/зависають, якщо content порожній
        if (content.length === 0) {
          content.push({ type: 'text', text: m.text || ' ' });
        }
        rawFormatted.push({ role: 'assistant', content });
      } else if (m.role === 'tool') {
        const content = m.results.map((r) => ({
          type: 'tool_result',
          tool_use_id: r.call.id,
          content: r.content,
          is_error: r.outcome !== 'ok',
        }));
        // Якщо інструментів не було (наприклад, пустий масив), ставимо плейсхолдер
        rawFormatted.push({
          role: 'user',
          content: content.length > 0 ? content : [{ type: 'text', text: 'Готово' }],
        });
      }
    }

    // Anthropic API вимагає чергування user / assistant.
    // Об'єднуємо послідовні повідомлення з однаковою роллю:
    const formattedMessages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [];
    for (const msg of rawFormatted) {
      const prev = formattedMessages[formattedMessages.length - 1];
      if (prev && prev.role === msg.role) {
        const prevContent = Array.isArray(prev.content)
          ? prev.content
          : [{ type: 'text', text: String(prev.content) }];
        const currContent = Array.isArray(msg.content)
          ? msg.content
          : [{ type: 'text', text: String(msg.content) }];
        prev.content = [...prevContent, ...currContent];
      } else {
        formattedMessages.push({ ...msg });
      }
    }

    const formattedTools = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.jsonSchema,
    }));

    const cleanUrl = opts.url.replace(/([^:]\/)\/+/g, '$1');

    const res = await fetchFn(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': opts.apiKey ?? 'ollama',
      },
      signal: AbortSignal.timeout(60_000), // 60 секунд тайм-аут проти вічного зависання
      body: JSON.stringify({
        model: opts.model,
        system,
        messages: formattedMessages,
        tools: formattedTools,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      throw new Error(`Messages API failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    let text = '';
    const calls: ToolCall[] = [];

    if (Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === 'text') text += block.text;
        if (block.type === 'thinking' && !text) text += block.thinking ?? '';
        if (block.type === 'tool_use') {
          calls.push({ id: block.id, name: block.name, input: block.input, raw: block });
        }
      }
    }

    // Захист для малих локальних моделей:
    // якщо модель вивела виклик інструмента як JSON у тексті замість блоку tool_use
    if (calls.length === 0 && text) {
      try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end > start) {
          const rawCandidate = text.slice(start, end + 1);
          const parsedJson = JSON.parse(rawCandidate);
          
          if (parsedJson && typeof parsedJson.name === 'string' && tools.some((t) => t.name === parsedJson.name)) {
            let inputArgs = parsedJson.arguments ?? parsedJson.input ?? parsedJson.parameters;
            if (typeof inputArgs === 'string') {
              try { inputArgs = JSON.parse(inputArgs); } catch {}
            }
            if (!inputArgs || typeof inputArgs !== 'object') {
              inputArgs = parsedJson.path ? { path: parsedJson.path } : {};
            }
            
            calls.push({
              id: `call_${Date.now()}`,
              name: parsedJson.name,
              input: inputArgs,
              raw: parsedJson,
            });
            text = ''; // очищаємо текст, бо це був виклик інструмента, а не фінальна відповідь
          }
        }
      } catch {
        // не JSON або не виклик інструмента — залишаємо звичайний текст
      }
    }

    const usage = fromMessagesUsage(data.usage ?? { input_tokens: 0, output_tokens: 0 });
    return { text, calls, usage };
  };
}

/** Адаптер форми Chat Completions (Gemini / Ollama /v1/chat/completions) з retry на 503/429 */
export function createChatAdapter(opts: AdapterOptions): Model {
  const fetchFn = opts.fetchFn ?? fetch;

  return async (system: string, messages: readonly Message[], tools: readonly AgentTool[]): Promise<ModelTurn> => {
    const formattedMessages: unknown[] = [{ role: 'system', content: system }];

    for (const m of messages) {
      if (m.role === 'user') {
        formattedMessages.push({ role: 'user', content: m.text });
      } else if (m.role === 'assistant') {
        const toolCalls = m.calls.map((c) => (c.raw ?? {
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.input) },
        }));

        formattedMessages.push({
          role: 'assistant',
          content: m.text ?? '',
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        });
      } else if (m.role === 'tool') {
        for (const r of m.results) {
          formattedMessages.push({
            role: 'tool',
            tool_call_id: r.call.id,
            content: r.content,
          });
        }
      }
    }

    const formattedTools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.jsonSchema,
      },
    }));

    const payload = JSON.stringify({
      model: opts.model,
      messages: formattedMessages,
      ...(formattedTools.length > 0 ? { tools: formattedTools } : {}),
    });

    let res: Response | null = null;
    const maxRetries = 4;
    let delay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        res = await fetchFn(opts.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {}),
          },
          body: payload,
        });

        if (res.ok) break;

        // Повторна спроба у разі перевантаження (503), ліміту (429) або помилки шлюзу (500+)
        if (res.status === 503 || res.status === 429 || res.status >= 500) {
          if (attempt < maxRetries) {
            console.log(`    [HTTP ${res.status}: очікування ${delay / 1000}с перед спробою ${attempt + 1}/${maxRetries}...]`);
            await new Promise((r) => setTimeout(r, delay));
            delay *= 2;
            continue;
          }
        }
        break;
      } catch (err) {
        if (attempt < maxRetries) {
          console.log(`    [Мережевий збій: очікування ${delay / 1000}с перед спробою ${attempt + 1}/${maxRetries}...]`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }
        throw err;
      }
    }

    if (!res || !res.ok) {
      throw new Error(`Chat API failed: ${res?.status} ${await res?.text()}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content ?? '';
    const calls: ToolCall[] = [];

    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        let input: unknown = {};
        try {
          input = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;
        } catch {
          input = tc.function.arguments;
        }
        calls.push({ id: tc.id, name: tc.function.name, input, raw: tc });
      }
    }

    const usage = fromChatUsage(data.usage ?? { prompt_tokens: 0, completion_tokens: 0 });
    return { text, calls, usage };
  };
}