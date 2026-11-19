# Виклик MCP-сервера lab2-corpus з OpenCode (бік 1)

Дата: 2026-11-19 (23:20 UTC) · OpenCode 1.19.0 · модель Big Pickle (OpenCode Zen) · сесія `ses_e09e334b6ffebsqKY9eFCqY1If`
Конфігурація: `opencode.json` → `mcp.lab2-corpus` (`MCP_CLIENT_LABEL=opencode`); `/mcp` → `lab2-corpus` connected.

Запит до агента:
> Виклич інструменти MCP-сервера lab2-corpus по черзі і покажи результат кожного дослівно: 1) fetch_chunk з id "doc-13#0001"; 2) search_corpus з query "What is the default test timeout in Playwright?" і topK 3; 3) fetch_chunk з id "doc-99#0000". Нічого більше не роби.

Виклики й результати (з вікна OpenCode, скорочено):

```
⚙ lab2-corpus_fetch_chunk [id=doc-13#0001]
[doc-13#0001] doc-13 › Test timeout · символи 1024–1636
## Test timeout
Playwright Test enforces a timeout for each test, 30 seconds by default. …

⚙ lab2-corpus_search_corpus [query=What is the default test timeout in Playwright?, topK=3]
[doc-13#0001] doc-13 › Test timeout · символи 1024–1636   cosine=0.9013 rrf=0.03252
doc-13#0009 doc-13 › Global timeout · символи 4046–4719    cosine=0.8742 rrf=0.03227
doc-13#0002 doc-13 › Test timeout › Set test timeout in the config · символи 1636–1866   cosine=0.8889 rrf=0.03200

⚙ lab2-corpus_fetch_chunk [id=doc-99#0000]
фрагмента doc-99#0000 немає в індексі

▣ Build · Big Pickle · 23.7s
```

Ті самі три виклики сервер записав у [mcp-calls.jsonl](mcp-calls.jsonl) з `"source":"opencode"` (23:20:50, 23:20:56, 23:21:02 UTC; третій — `"result":"refused"`). Плагін журналу OpenCode записав перші два виклики в `.agent-log/opencode.jsonl` (L275, L276); відмову не записав — хук `tool.execute.after` на результат з `isError` не спрацював.