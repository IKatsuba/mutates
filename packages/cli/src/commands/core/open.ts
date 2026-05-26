import { resolve } from 'node:path';
import { defineCommand } from 'citty';

import { exitCodeFor, renderError, renderResult } from '../../client/output';
import { connectClient } from '../../client/rpc-client';
import { RpcError } from '../../proto/jsonrpc';

/**
 * `mutates open` — open a session on the daemon for the given project
 * root (or `cwd` by default). Spawns a daemon if none is alive.
 *
 * Prints the `{ sessionId, tsconfig, idleTimeoutMs }` payload returned
 * by the daemon. `--json` emits it as a single-line JSON object.
 */
export default defineCommand({
  meta: {
    name: 'open',
    description: 'Open a mutates session for a project root',
  },
  args: {
    root: {
      type: 'string',
      description: 'Project root (defaults to cwd)',
    },
    json: {
      type: 'boolean',
      description: 'Print the response as JSON instead of text',
      default: false,
    },
  },
  async run({ args }) {
    const root = resolve(args.root ?? process.cwd());
    try {
      const conn = await connectClient({ root });
      try {
        const result = await conn.call('session.open', { root });
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
