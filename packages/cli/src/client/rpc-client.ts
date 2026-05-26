import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, unlinkSync } from 'node:fs';
import { connect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve as resolvePath } from 'node:path';

import {
  lockfilePath,
  read as readLockfile,
  unlink as unlinkLockfile,
  type SessionLockfile,
} from '../discovery/lockfile';
import { ErrorCode } from '../proto/error-codes';
import {
  NdjsonCodec,
  RpcError,
  type RpcMessage,
  type RpcRequest,
  type RpcResponse,
} from '../proto/jsonrpc';

const SPAWN_TIMEOUT_MS = 2_000;
const SPAWN_POLL_MS = 50;

export interface ConnectOptions {
  /** Absolute or relative project root. */
  root: string;
  /** Optional pre-existing session id to validate via `session.list`. */
  sessionId?: string;
  /** Override the daemon entry path. Used by integration tests. */
  daemonEntry?: string;
  /** Override the Node executable used to spawn the daemon. */
  node?: string;
}

export interface Connection {
  call<R = unknown>(method: string, params?: unknown): Promise<R>;
  close(): Promise<void>;
}

interface ConnectionInternals {
  socket: Socket;
  pending: Map<RpcRequest['id'], (msg: RpcResponse) => void>;
  codec: NdjsonCodec;
  nextId: number;
}

/**
 * Default daemon entry path resolved from this module's compiled location.
 * Production: `dist/packages/cli/src/daemon/entry.js`. Tests typically
 * pass an explicit path via {@link ConnectOptions.daemonEntry}.
 */
function defaultDaemonEntry(): string {
  // The compiled JS sits next to this file at runtime (./client/rpc-client.js).
  // The daemon entry compiles to ../daemon/entry.js.
  return join(__dirname, '..', 'daemon', 'entry.js');
}

/**
 * Derive a per-root socket path. Unix uses a 32-hex suffix under
 * `os.tmpdir()`; Windows uses a named pipe with the same hash. The
 * caller passes the chosen path to `--sock`, ensuring the daemon and
 * the client agree.
 */
export function deriveSocketPath(root: string): string {
  const abs = resolvePath(root);
  const hash = createHash('sha256').update(abs).digest('hex').slice(0, 16);
  if (process.platform === 'win32') {
    return `\\\\.\\pipe\\mutates-${hash}`;
  }
  return join(tmpdir(), `mutates-${hash}.sock`);
}

/**
 * Discover or spawn a daemon for `root`, perform the handshake, return a
 * {@link Connection} for further calls.
 *
 * Discovery rules (see design.md §RpcClient):
 *  1. Read the lockfile. If present and `process.kill(pid, 0)` succeeds,
 *     connect to its `sock`.
 *  2. On lockfile miss or stale (read returns null) — unlink any stale
 *     lockfile, spawn `node <entry> --root <root> --sock <derived>`
 *     detached, poll for the socket up to 2 s.
 *  3. After connect: if `sessionId` is supplied, call `session.list` and
 *     ensure it appears; else call `session.open { root }`.
 */
export async function connectClient(opts: ConnectOptions): Promise<Connection> {
  const absRoot = resolvePath(opts.root);
  let lock: SessionLockfile | null = readLockfile(absRoot);

  if (!lock) {
    // If the caller is pinning to a specific session id and no daemon
    // is alive for this root, the session cannot possibly exist — fail
    // fast instead of spawning a fresh daemon just to validate a id
    // that we already know is dead.
    if (opts.sessionId) {
      throw new RpcError(ErrorCode.SessionNotFound, `session not found: ${opts.sessionId}`, {
        sessionId: opts.sessionId,
      });
    }
    // Clear any stale entry left by a crashed daemon. We unlink both the
    // lockfile JSON and the Unix socket file — otherwise the fresh
    // daemon fails to bind with EADDRINUSE on the old socket path.
    unlinkLockfile(absRoot);
    const sock = deriveSocketPath(absRoot);
    if (process.platform !== 'win32') {
      try {
        unlinkSync(sock);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
    }
    spawnDaemon(absRoot, sock, opts);
    lock = await waitForLockfile(absRoot);
  }

  const connection = await openSocketConnection(lock.sock);

  if (opts.sessionId) {
    const sessions = await connection.call<Array<{ id: string }>>('session.list', {});
    const exists = sessions.some((s) => s.id === opts.sessionId);
    if (!exists) {
      await connection.close();
      throw new RpcError(ErrorCode.SessionNotFound, `session not found: ${opts.sessionId}`, {
        sessionId: opts.sessionId,
      });
    }
  }

  return connection;
}

function spawnDaemon(root: string, sock: string, opts: ConnectOptions): void {
  const entry = opts.daemonEntry ?? defaultDaemonEntry();
  const node = opts.node ?? process.execPath;
  if (!existsSync(entry)) {
    throw new Error(`mutates daemon entry not found at ${entry}`);
  }
  const child = spawn(node, [entry, '--root', root, '--sock', sock], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

async function waitForLockfile(root: string): Promise<SessionLockfile> {
  const deadline = Date.now() + SPAWN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const lock = readLockfile(root);
    if (lock && existsSync(lockfilePath(root))) return lock;
    await sleep(SPAWN_POLL_MS);
  }
  throw new Error(`mutates daemon did not start within ${SPAWN_TIMEOUT_MS}ms`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function openSocketConnection(sock: string): Promise<Connection> {
  return new Promise<Connection>((resolveConn, rejectConn) => {
    const codec = new NdjsonCodec();
    const socket = connect(sock);
    const internals: ConnectionInternals = {
      socket,
      pending: new Map(),
      codec,
      nextId: 1,
    };
    const decoder = codec.decode();
    socket.pipe(decoder);

    decoder.on('data', (msg: RpcMessage) => {
      const id = (msg as RpcResponse).id;
      if (id === null || id === undefined) return;
      const resolver = internals.pending.get(id);
      if (resolver) {
        internals.pending.delete(id);
        resolver(msg as RpcResponse);
      }
    });

    const failPending = (err: Error): void => {
      for (const [, resolver] of internals.pending) {
        // resolver expects an RpcResponse; synthesize an error response.
        resolver({
          jsonrpc: '2.0',
          id: null,
          error: { code: ErrorCode.IoError, message: err.message },
        });
      }
      internals.pending.clear();
    };

    socket.on('error', (err) => {
      failPending(err);
      rejectConn(err);
    });
    socket.on('close', () => failPending(new Error('socket closed')));

    socket.once('connect', () => {
      const conn: Connection = {
        async call<R>(method: string, params?: unknown): Promise<R> {
          const id = internals.nextId++;
          const frame: RpcRequest = {
            jsonrpc: '2.0',
            id,
            method,
            params: params ?? {},
          };
          return new Promise<R>((resolveCall, rejectCall) => {
            internals.pending.set(id, (msg) => {
              if ('error' in msg) {
                rejectCall(new RpcError(msg.error.code, msg.error.message, msg.error.data));
              } else {
                resolveCall(msg.result as R);
              }
            });
            socket.write(codec.encode(frame));
          });
        },
        close(): Promise<void> {
          return new Promise((res) => {
            socket.end(() => res());
          });
        },
      };
      resolveConn(conn);
    });
  });
}
