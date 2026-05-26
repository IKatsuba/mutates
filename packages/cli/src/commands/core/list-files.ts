import { resolve } from 'node:path';
import { defineCommand } from 'citty';

import { exitCodeFor, renderError, renderResult } from '../../client/output';
import { resolveSessionId } from '../../client/resolve-session';
import { connectClient } from '../../client/rpc-client';
import { RpcError } from '../../proto/jsonrpc';

/**
 * `mutates list-files [--glob <pattern>]` — list every source file the
 * daemon knows about, each annotated with a `dirty` flag.
 */
export default defineCommand({
  meta: {
    name: 'list-files',
    description: 'List source files known to the session',
  },
  args: {
    glob: {
      type: 'string',
      description: 'Filter by glob pattern',
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
        const sessionId = await resolveSessionId(conn, root, args.session);
        const params: { sessionId: string; glob?: string } = { sessionId };
        if (args.glob) params.glob = args.glob;
        const result = await conn.call('listFiles', params);
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
