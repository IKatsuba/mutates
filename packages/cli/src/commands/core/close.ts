import { resolve } from 'node:path';
import { defineCommand } from 'citty';

import { exitCodeFor, renderError, renderResult } from '../../client/output';
import { connectClient } from '../../client/rpc-client';
import { RpcError } from '../../proto/jsonrpc';

/**
 * `mutates close` — close a session by id, or close every live session
 * for this project root when `--all` is set.
 *
 * When neither `--session` nor `--all` is supplied, the command exits
 * with an INVALID_INPUT-shaped error payload.
 */
export default defineCommand({
  meta: {
    name: 'close',
    description: 'Close a session (or all sessions with --all)',
  },
  args: {
    session: {
      type: 'string',
      description: 'Session id to close',
    },
    all: {
      type: 'boolean',
      description: 'Close every live session for this root',
      default: false,
    },
    root: {
      type: 'string',
      description: 'Project root (defaults to cwd)',
    },
    json: {
      type: 'boolean',
      description: 'Print result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const root = resolve(args.root ?? process.cwd());
    if (!args.session && !args.all) {
      renderError(new RpcError(-32602, 'mutates close: pass --session <id> or --all'));
      process.exitCode = 2;
      return;
    }

    try {
      const conn = await connectClient({ root });
      try {
        const closed: string[] = [];
        if (args.all) {
          const sessions = await conn.call<Array<{ id: string }>>('session.list', {});
          for (const s of sessions) {
            await conn.call('session.close', { sessionId: s.id });
            closed.push(s.id);
          }
          // `--all` is the user saying "I'm done with this daemon" — shut it
          // down so the lockfile and socket clean up immediately, instead
          // of leaving the daemon hanging until its idle timer fires.
          try {
            await conn.call('daemon.shutdown', {});
          } catch {
            // Older daemons (or a daemon that races us closing first) may
            // not handle daemon.shutdown. Either way the close above has
            // already removed every session — non-fatal.
          }
        } else if (args.session) {
          await conn.call('session.close', { sessionId: args.session });
          closed.push(args.session);
        }
        renderResult({ closed }, args.json ? 'json' : 'text');
      } finally {
        await conn.close();
      }
    } catch (err) {
      renderError(err);
      process.exitCode = err instanceof RpcError ? exitCodeFor(err) : 1;
    }
  },
});
