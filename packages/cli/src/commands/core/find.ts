import { resolve } from 'node:path';
import { defineCommand } from 'citty';

import { exitCodeFor, renderError, renderResult } from '../../client/output';
import { connectClient } from '../../client/rpc-client';
import { RpcError } from '../../proto/jsonrpc';

/**
 * `mutates find <kind> [--query <json>]` — query the active session for
 * nodes by kind. Prints the result list (each entry is
 * `{ ref, kind, file, name? }`).
 */
export default defineCommand({
  meta: {
    name: 'find',
    description: 'Find nodes by kind and optional JSON query',
  },
  args: {
    kind: {
      type: 'positional',
      description: 'Node kind (class, function, interface, enum, type, variable, import, export)',
      required: true,
    },
    query: {
      type: 'string',
      description: 'JSON query object (e.g. \'{"pattern":"/abs/**/*.ts"}\')',
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
    let parsedQuery: Record<string, unknown> = {};
    if (args.query) {
      try {
        parsedQuery = JSON.parse(args.query) as Record<string, unknown>;
      } catch (err) {
        renderError(new RpcError(-32602, `find: invalid --query JSON: ${(err as Error).message}`));
        process.exitCode = 2;
        return;
      }
    }
    try {
      const conn = await connectClient({ root, sessionId: args.session });
      try {
        const sessionId = args.session ?? (await openSession(conn, root));
        const result = await conn.call('find', {
          sessionId,
          kind: args.kind,
          query: parsedQuery,
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
