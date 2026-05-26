import type { Classified } from './classifier';

const BANNER = '// GENERATED — do not edit. Run `nx run cli:gen-commands` to refresh.';

/**
 * Emit a citty subcommand module for one generated op.
 *
 * Every generated command shares the same arg surface (`--file`, `--ref`,
 * `--filter`, `--json`, `--session`, `--root`) — the daemon-side handler
 * decides which of them are meaningful for the targetShape; the CLI is
 * deliberately permissive so a single agent prompt can drive any op
 * without per-command memorization.
 */
export function emitCommand(c: Classified): string {
  const name = `${c.verb}-${c.category}`;
  const desc = describe(c);
  const requiresJson = needsJson(c);
  const requiresFile = c.targetShape === 'pattern';
  return `${BANNER}
import { defineCommand } from 'citty';
import { resolve } from 'node:path';

import { exitCodeFor, renderError, renderResult } from '../../../client/output';
import { connectClient } from '../../../client/rpc-client';
import { resolveSessionId } from '../../../client/resolve-session';
import { RpcError } from '../../../proto/jsonrpc';

export default defineCommand({
  meta: {
    name: '${name}',
    description: ${JSON.stringify(desc)},
  },
  args: {
    file: { type: 'string', description: 'Glob pattern of target source files'${requiresFile ? ', required: true' : ''} },
    ref: { type: 'string', description: 'Node ref (@nN) — alternative to --file' },
    filter: { type: 'string', description: 'JSON-encoded match query for narrowing target nodes' },
    json: { type: 'string', description: 'Inline JSON payload (use "-" to read from stdin)'${requiresJson ? ', required: true' : ''} },
    root: { type: 'string', description: 'Project root (defaults to cwd)' },
    session: { type: 'string', description: 'Session id (defaults to the daemon\\'s open session)' },
  },
  async run({ args }) {
    const root = resolve(args.root ?? process.cwd());
    try {
      const conn = await connectClient({ root, sessionId: args.session });
      try {
        const sessionId = await resolveSessionId(conn, root, args.session);
        const data = await readJsonArg(args.json);
        const filter = args.filter ? (JSON.parse(args.filter) as Record<string, unknown>) : undefined;
        const target: Record<string, unknown> = {};
        if (args.file) target['file'] = args.file;
        if (args.ref) target['ref'] = args.ref;
        if (filter) target['filter'] = filter;
        const result = await conn.call('op', {
          sessionId,
          op: '${c.coreName}',
          target,
          data,
        });
        renderResult(result, 'json');
      } finally {
        await conn.close();
      }
    } catch (err) {
      renderError(err);
      process.exitCode = err instanceof RpcError ? exitCodeFor(err) : 1;
    }
  },
});

async function readJsonArg(raw: string | undefined): Promise<unknown> {
  if (raw === undefined) return undefined;
  if (raw === '-') {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  return JSON.parse(raw);
}
`;
}

function needsJson(c: Classified): boolean {
  return (
    c.targetShape === 'pattern' ||
    c.targetShape === 'nodes' ||
    c.targetShape === 'declarations-editor'
  );
}

function describe(c: Classified): string {
  switch (c.verb) {
    case 'add':
      return `Add one or more ${c.category} declarations to matched source files.`;
    case 'edit':
      return `Edit ${c.category} matching the target with a partial structure override.`;
    case 'remove':
      return `Remove ${c.category} matching the target.`;
    case 'get':
      return `Return refs for ${c.category} matching the optional query.`;
  }
}
