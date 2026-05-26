import { resolve } from 'node:path';
import { defineCommand } from 'citty';

import { exitCodeFor, renderError, renderResult } from '../../client/output';
import { connectClient } from '../../client/rpc-client';
import { RpcError } from '../../proto/jsonrpc';

/**
 * `mutates reload <file>` — re-read `file` from disk into the session.
 * Invalidates any refs that pointed into that file. Per Req 7.3 this
 * is the only path that triggers a reload.
 */
export default defineCommand({
  meta: {
    name: 'reload',
    description: 'Refresh a file in the session from disk',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to refresh',
      required: true,
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
        const result = await conn.call('reload', {
          sessionId,
          file: resolve(args.file),
        });
        renderResult(result, args.json ? 'json' : 'text');
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
