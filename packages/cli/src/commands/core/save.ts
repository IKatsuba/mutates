import { resolve } from 'node:path';
import { defineCommand } from 'citty';

import { exitCodeFor, renderError, renderResult } from '../../client/output';
import { resolveSessionId } from '../../client/resolve-session';
import { connectClient } from '../../client/rpc-client';
import { RpcError } from '../../proto/jsonrpc';

/**
 * `mutates save [--file <path>] [--dry-run]` — flush dirty files to
 * disk. With `--dry-run`, only previews what would be written.
 */
export default defineCommand({
  meta: {
    name: 'save',
    description: 'Save dirty files back to disk',
  },
  args: {
    file: {
      type: 'string',
      description: 'Limit save to one file',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Preview without writing',
      default: false,
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
        const params: { sessionId: string; file?: string; dryRun?: boolean } = { sessionId };
        if (args.file) params.file = resolve(args.file);
        if (args['dry-run']) params.dryRun = true;
        const result = await conn.call('save', params);
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
