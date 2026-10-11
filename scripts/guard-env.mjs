#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const ENV_REGEX = /(^|[^A-Za-z0-9_$])\.env(\.(local|development|production|test)(\.local)?)?([^.A-Za-z0-9_]|$)/i;

let inputRaw = '';
process.stdin.on('data', (chunk) => { inputRaw += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(inputRaw || '{}');

    // Витягуємо команду з tool_input або з toolArgs Copilot
    let target = data.tool_input?.command || data.tool_input?.path || data.tool_input?.file_path || '';
    if (!target && data.toolArgs) {
      if (typeof data.toolArgs === 'string') {
        try {
          const parsed = JSON.parse(data.toolArgs);
          target = parsed.command || parsed.path || parsed.file_path || parsed.filePath || data.toolArgs;
        } catch {
          target = data.toolArgs;
        }
      } else if (typeof data.toolArgs === 'object') {
        target = data.toolArgs.command || data.toolArgs.path || data.toolArgs.file_path || data.toolArgs.filePath || '';
      }
    }
    if (!target) target = inputRaw;

    if (ENV_REGEX.test(target) || ENV_REGEX.test(inputRaw)) {
      const logDir = join(process.cwd(), '.agent-log');
      if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

      const sanitized = String(target).replace(/=[^\s]+/g, '=***').slice(0, 200);
      const logEntry = {
        ts: new Date().toISOString(),
        tool: data.toolName || data.tool_name || data.tool || 'Shell',
        input: { command: sanitized },
        result: 'denied',
        session: data.sessionId || data.session_id || 'copilot',
        source: 'copilot',
      };

      appendFileSync(join(logDir, 'copilot.jsonl'), JSON.stringify(logEntry) + '\n', 'utf8');

      console.log(JSON.stringify({
        permissionDecision: "deny",
        permissionDecisionReason: "Політика курсу: файли .env читає і змінює людина, не агент. Дія заблокована."
      }));
      console.error('Політика курсу: файли .env читає і змінює людина, не агент. Дія заблокована.');
      process.exit(2);
    }
  } catch (err) {
    // ігноруємо помилки
  }
  process.exit(0);
});