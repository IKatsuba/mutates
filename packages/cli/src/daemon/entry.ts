import { createServer, type Server, type Socket } from 'node:net';
import { resolve as resolvePath } from 'node:path';

import pkg from '../../package.json';
import { unlink as unlinkLockfile, write as writeLockfile } from '../discovery/lockfile';
import { NdjsonCodec, type RpcMessage, type RpcResponse } from '../proto/jsonrpc';
import { Dispatcher } from './dispatcher';
import { SessionManager } from './session-manager';

export interface DaemonArgs {
  root: string;
  sock: string;
  idleTimeoutMs?: number;
}

/** Parse argv (positionals stripped) into the daemon's run args. */
export function parseArgs(argv: string[]): DaemonArgs {
  let root: string | null = null;
  let sock: string | null = null;
  let idleTimeoutMs: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root') {
      root = argv[++i];
    } else if (arg === '--sock') {
      sock = argv[++i];
    } else if (arg === '--idle-timeout') {
      idleTimeoutMs = Number(argv[++i]);
    }
  }
  if (!root) throw new Error('daemon: --root is required');
  if (!sock) throw new Error('daemon: --sock is required');
  return { root: resolvePath(root), sock, idleTimeoutMs };
}

/**
 * Daemon process handle returned by {@link startDaemon}. Tests use this
 * to drive a clean shutdown; the binary entry wires signal handlers
 * directly.
 */
export interface DaemonHandle {
  server: Server;
  manager: SessionManager;
  dispatcher: Dispatcher;
  shutdown(): Promise<void>;
}

/**
 * Construct and start a daemon. The returned promise resolves once the
 * underlying `net.Server` is listening and the lockfile has been
 * written. On graceful shutdown the lockfile is unlinked and the
 * server is closed.
 */
export async function startDaemon(args: DaemonArgs): Promise<DaemonHandle> {
  const codec = new NdjsonCodec();
  const manager = new SessionManager({
    idleTimeoutMs: args.idleTimeoutMs,
    onIdle: () => {
      void shutdown();
    },
  });
  const dispatcher = new Dispatcher({ manager });
  const server = createServer((socket) => attachConnection(socket, codec, dispatcher));

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(args.sock, () => {
      server.off('error', rejectListen);
      resolveListen();
    });
  });

  // Write the lockfile only after the server is listening so a client
  // that races our spawn never sees a path it cannot connect to.
  let lockfileWritten = false;
  try {
    writeLockfile({
      version: 1,
      pid: process.pid,
      sock: args.sock,
      root: args.root,
      sessionId: '',
      startedAt: Date.now(),
      cliVersion: pkg.version,
    });
    lockfileWritten = true;
  } catch (err) {
    // If we lost the lockfile race, close down so the winner stays
    // authoritative for this root.
    await closeServer(server);
    throw err;
  }

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    manager.stop();
    if (lockfileWritten) unlinkLockfile(args.root);
    await closeServer(server);
  };

  return { server, manager, dispatcher, shutdown };
}

/**
 * Process entrypoint: parse argv, start the daemon, install SIGINT /
 * SIGTERM handlers that drain gracefully.
 */
export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const handle = await startDaemon(args);

  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, () => {
      void handle.shutdown().then(() => process.exit(0));
    });
  }
}

/**
 * Wire a single connected socket to the dispatcher. Each frame is read,
 * dispatched, and the response written back NDJSON-encoded.
 */
export function attachConnection(socket: Socket, codec: NdjsonCodec, dispatcher: Dispatcher): void {
  const decoder = codec.decode();
  socket.pipe(decoder);

  decoder.on('data', (message: RpcMessage) => {
    void (async () => {
      const response = await dispatcher.dispatch(message);
      if (response) socket.write(codec.encode(response));
    })().catch((err) => {
      // Final safety net — convert into a JSON-RPC envelope-less log.
      const payload: RpcResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: err instanceof Error ? err.message : String(err),
        },
      };
      socket.write(codec.encode(payload));
    });
  });

  decoder.on('error', () => {
    // Malformed frame — close the connection; the client should reconnect.
    socket.destroy();
  });

  socket.on('error', () => {
    // Ignore client-side disconnects; nothing actionable here.
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((res) => {
    server.close(() => res());
  });
}

// Allow the file to be invoked directly: `node daemon/entry.js --root ... --sock ...`
if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
