import { resolve } from 'node:path';
import { defineCommand } from 'citty';

import { formatSnapshot } from '../../client/format-snapshot';
import { exitCodeFor, renderError, renderResult } from '../../client/output';
import { resolveSessionId } from '../../client/resolve-session';
import { connectClient } from '../../client/rpc-client';
import { RpcError } from '../../proto/jsonrpc';
import type { SnapshotResult } from '../../session/snapshot';

/**
 * `mutates snapshot <target>` — print the snapshot for `target`.
 *
 * Target shape:
 *  - Starts with `@n` → drill into the referenced node (`{ ref }`).
 *  - Anything else → treated as a file path (`{ file: resolved }`).
 *
 * `--json` returns the raw {@link SnapshotResult}; default is the
 * human-readable text from `format-snapshot.ts`.
 */
export default defineCommand({
  meta: {
    name: 'snapshot',
    description: 'Print an AST snapshot for a file or a node ref',
  },
  args: {
    target: {
      type: 'positional',
      description: 'A file path or a @nN ref',
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
      description: 'Print as JSON instead of text',
      default: false,
    },
  },
  async run({ args }) {
    const root = resolve(args.root ?? process.cwd());
    try {
      const conn = await connectClient({ root, sessionId: args.session });
      try {
        const target = args.target.startsWith('@n')
          ? { ref: args.target }
          : { file: resolve(args.target) };
        const sessionId = await resolveSessionId(conn, root, args.session);
        const result = await conn.call<SnapshotResult>('snapshot', { sessionId, target });
        if (args.json) renderResult(result, 'json');
        else process.stdout.write(formatSnapshot(result));
      } finally {
        await conn.close();
      }
    } catch (err) {
      renderError(err);
      process.exitCode = err instanceof RpcError ? exitCodeFor(err) : 1;
    }
  },
});
