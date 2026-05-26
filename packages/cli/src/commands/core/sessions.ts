import { resolve } from 'node:path';
import { defineCommand } from 'citty';

import { exitCodeFor, renderError, renderResult } from '../../client/output';
import { connectClient } from '../../client/rpc-client';
import { listAll as listAllLockfiles } from '../../discovery/lockfile';
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
    all: {
      type: 'boolean',
      description: 'List every live daemon across all roots (reads the lockfile dir directly)',
      default: false,
    },
    session: {
      type: 'string',
      description: 'Restrict the listing to one session id (validated against the daemon)',
    },
    json: {
      type: 'boolean',
      description: 'Print as JSON',
      default: false,
    },
  },
  async run({ args }) {
    // `--all` does not talk to any daemon: it enumerates every live
    // lockfile in the runtime dir. This is the only way to surface
    // sessions that belong to roots the caller does not own (Req 10.1
    // — one daemon per root) without spawning a daemon for each.
    if (args.all) {
      try {
        const entries = listAllLockfiles().map((lock) => ({
          pid: lock.pid,
          root: lock.root,
          sock: lock.sock,
          startedAt: lock.startedAt,
          cliVersion: lock.cliVersion,
          ageMs: Date.now() - lock.startedAt,
        }));
        renderResult(entries, args.json ? 'json' : 'text');
      } catch (err) {
        renderError(err);
        process.exitCode = 1;
      }
      return;
    }

    const root = resolve(args.root ?? process.cwd());
    try {
      // Passing `sessionId` makes `connectClient` validate that the id
      // is actually live on the daemon, raising SESSION_NOT_FOUND when
      // it isn't. Without this the command would silently filter to an
      // empty list and exit 0 — masking the agent's mistake.
      const conn = await connectClient({ root, sessionId: args.session });
      try {
        const result = await conn.call<Array<{ id: string }>>('session.list', {});
        const filtered = args.session ? result.filter((s) => s.id === args.session) : result;
        renderResult(filtered, args.json ? 'json' : 'text');
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
