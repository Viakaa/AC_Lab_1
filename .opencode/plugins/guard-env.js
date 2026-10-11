import { existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ENV_REGEX = /(^|[^A-Za-z0-9_$])\.env(\.(local|development|production|test)(\.local)?)?([^.A-Za-z0-9_]|$)/i;

export const GuardEnvPlugin = async (ctx) => {
  return {
    'tool.execute.before': async (input, output) => {
      const tool = input?.tool || 'unknown';
      const args = input?.args || output?.args || {};
      const target = args.command || args.filePath || args.path || JSON.stringify(args);

      if (ENV_REGEX.test(target)) {
        const logDir = join(process.cwd(), '.agent-log');
        if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

        const sanitized = String(target).replace(/=[^\s]+/g, '=***').slice(0, 200);
        const logEntry = {
          ts: new Date().toISOString(),
          tool: tool,
          input: args.command ? { command: sanitized } : { file_path: sanitized },
          result: 'denied',
          session: 'opencode',
          source: 'opencode',
        };

        appendFileSync(join(logDir, 'opencode.jsonl'), JSON.stringify(logEntry) + '\n', 'utf8');

        throw new Error('Політика курсу: файли .env читає і змінює людина, не агент. Дія заблокована.');
      }
    },
  };
};

export default GuardEnvPlugin;