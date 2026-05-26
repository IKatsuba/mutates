import { resolve } from 'node:path';
import { defineCommand } from 'citty';

import { exitCodeFor, renderError, renderResult } from '../../client/output';
import { connectClient } from '../../client/rpc-client';
import { RpcError } from '../../proto/jsonrpc';

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List sessions live on the daemon for this root',
  },
  args: {
    root: {
      type: 'string',
      description: 'Project root (defaults to cwd)',
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
      const conn = await connectClient({ root });
      try {
        const result = await conn.call('session.list', {});
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

export default defineCommand({
  meta: {
    name: 'sessions',
    description: 'Inspect mutates sessions',
  },
  subCommands: {
    list,
  },
});
