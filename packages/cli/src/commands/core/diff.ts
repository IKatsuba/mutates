import { resolve } from 'node:path';
import { defineCommand } from 'citty';

import { exitCodeFor, renderError, renderResult } from '../../client/output';
import { connectClient } from '../../client/rpc-client';
import { RpcError } from '../../proto/jsonrpc';

/**
 * `mutates diff [--file <path>]` — print unified diffs for every
 * dirty file (or just `--file` if supplied). Text mode prints each
 * patch back-to-back; `--json` returns the raw array.
 */
export default defineCommand({
  meta: {
    name: 'diff',
    description: 'Print unified diff between in-memory and on-disk content',
  },
  args: {
    file: {
      type: 'string',
      description: 'Limit diff to one file',
    },
    root: {
      type: 'string',
      description: 'Project root (defaults to cwd)',
    },
    session: {
      type: 'string',
      description: 'Session id',
    },
    json: {
      type: 'boolean',
      description: 'Print as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const root = resolve(args.root ?? process.cwd());
    try {
      const conn = await connectClient({ root, sessionId: args.session });
      try {
        const sessionId = args.session ?? (await openSession(conn, root));
        const params: { sessionId: string; file?: string } = { sessionId };
        if (args.file) params.file = resolve(args.file);
        const result = await conn.call<Array<{ file: string; unified: string }>>('diff', params);
        if (args.json) {
          renderResult(result, 'json');
        } else {
          for (const entry of result) {
            if (entry.unified) process.stdout.write(entry.unified);
          }
        }
      } finally {
        await conn.close();
      }
    } catch (err) {
      renderError(err);
      process.exitCode = err instanceof RpcError ? exitCodeFor(err) : 1;
    }
  },
});

async function openSession(
  conn: { call: <R>(method: string, params?: unknown) => Promise<R> },
  root: string,
): Promise<string> {
  const opened = await conn.call<{ sessionId: string }>('session.open', { root });
  return opened.sessionId;
}
