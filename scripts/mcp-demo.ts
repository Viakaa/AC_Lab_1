/**
 * ДРУГИЙ БІК (крок 09): застосунок викликає ті самі інструменти MCP-сервера lab2-corpus.
 * Запуск (Ollama має бути запущена — search_corpus ембедить запит):
 *   npx tsx scripts/mcp-demo.ts "What is the default test timeout in Playwright?"
 * Сервер окремо не запускається: його процес породжує транспорт.
 */
import { Client } from '@modelcontextprotocol/client';
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const query = process.argv[2] ?? 'What is the default test timeout in Playwright?';

const client = new Client({ name: 'lab2-app', version: '1.0.0' });

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['tsx', 'src/mcp/server.ts'],
  // НЕ ...process.env: інакше застосунок віддав би серверу всі свої секрети.
  // MCP_CLIENT_LABEL — підпис у журналі сервера: за ним видно, що виклик ЗВІДСИ.
  env: { ...getDefaultEnvironment(), MCP_CLIENT_LABEL: 'lab2-app' },
});

function show(title: string, result: Awaited<ReturnType<typeof client.callTool>>): void {
  console.log(`\n=== ${title}`);
  // Тип блоку перевіряємо ДО читання .text — канонічна форма з документації SDK.
  for (const block of result.content) {
    if (block.type === 'text') console.log(block.text);
  }
  if (result.isError) console.log('^ це ВІДМОВА сервера, і вона очікувана');
}

async function main(): Promise<void> {
  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    for (const tool of tools) console.log(`${tool.name} — ${tool.description ?? ''}`);

    show(`search_corpus «${query}», topK 3`, await client.callTool({ name: 'search_corpus', arguments: { query, topK: 3 } }));
    show('fetch_chunk doc-13#0001', await client.callTool({ name: 'fetch_chunk', arguments: { id: 'doc-13#0001' } }));
    // третій виклик навмисно за межею: доказ, що застосунок бачить відмову
    show('fetch_chunk doc-99#0000 (за межею індексу)', await client.callTool({ name: 'fetch_chunk', arguments: { id: 'doc-99#0000' } }));
  } finally {
    // без close() процес сервера залишиться живим
    await client.close();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});