/**
 * ТРАСИ СКРИПТІВ (крок 06) у Langfuse — той самий LangfuseSpanProcessor, що й у /api/agent з Лаб. 1.
 * Вмикається лише тоді, коли в оточенні є LANGFUSE_PUBLIC_KEY і LANGFUSE_SECRET_KEY; інакше — no-op.
 *
 * gen_ai.system стоїть на КОЖНОМУ спані: типовий фільтр LangfuseSpanProcessor пропускає лише
 * спани з атрибутами gen_ai.* або від відомих LLM-бібліотек — без нього траса мовчки зникне.
 */
import { context, trace, type Attributes, type Span } from '@opentelemetry/api';

export type ObservationType = 'span' | 'retriever' | 'generation';

export interface RunTracing {
  readonly enabled: boolean;
  span(name: string, type: ObservationType, attributes: Attributes, parent?: Span): Span;
  shutdown(): Promise<void>;
}

export async function startRunTracing(system: string): Promise<RunTracing> {
  const enabled = Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
  let shutdown = async (): Promise<void> => {};
  if (enabled) {
    // динамічний імпорт: без ключів процесор навіть не створюється
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { langfuseSpanProcessor } = await import('./langfuse');
    const sdk = new NodeSDK({ spanProcessors: [langfuseSpanProcessor] });
    sdk.start();
    shutdown = async () => {
      await langfuseSpanProcessor.forceFlush();
      await sdk.shutdown();
    };
  }
  const tracer = trace.getTracer('lab2-eval');

  return {
    enabled,
    span: (name, type, attributes, parent) =>
      tracer.startSpan(
        name,
        { attributes: { 'gen_ai.system': system, 'langfuse.observation.type': type, ...attributes } },
        parent ? trace.setSpan(context.active(), parent) : context.active(),
      ),
    shutdown: () => shutdown(),
  };
}