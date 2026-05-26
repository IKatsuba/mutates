import { mkdtempSync, rmSync } from 'node:fs';
import { connect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ErrorCode } from '../proto/error-codes';
import { NdjsonCodec, type RpcMessage, type RpcRequest, type RpcResponse } from '../proto/jsonrpc';
import { startDaemon, type DaemonHandle } from './entry';

/**
 * Helper that opens a client socket against a running daemon and lets a
 * test send/receive single JSON-RPC frames.
 */
function makeClient(sockPath: string): Promise<{
  call(req: Omit<RpcRequest, 'jsonrpc'>): Promise<RpcResponse>;
  close(): void;
}> {
  return new Promise((resolve, reject) => {
    const codec = new NdjsonCodec();
    const socket: Socket = connect(sockPath);
    const decoder = codec.decode();
    socket.pipe(decoder);
    const pending = new Map<RpcRequest['id'], (msg: RpcResponse) => void>();
    decoder.on('data', (msg: RpcMessage) => {
      const id = (msg as RpcResponse).id;
      const handler = id !== null && pending.get(id);
      if (handler) {
        pending.delete(id as RpcRequest['id']);
        handler(msg as RpcResponse);
      }
    });
    socket.once('connect', () => {
      resolve({
        call(req) {
          return new Promise<RpcResponse>((res) => {
            pending.set(req.id, res);
            socket.write(codec.encode({ jsonrpc: '2.0', ...req }));
          });
        },
        close() {
          socket.destroy();
        },
      });
    });
    socket.once('error', reject);
  });
}

describe('daemon dispatcher (in-process)', () => {
  let runtimeDir: string;
  let tmpRoot: string;
  let sockPath: string;
  let daemon: DaemonHandle;

  beforeEach(async () => {
    runtimeDir = mkdtempSync(join(tmpdir(), 'mutates-runtime-'));
    process.env['MUTATES_RUNTIME_DIR'] = runtimeDir;
    tmpRoot = mkdtempSync(join(tmpdir(), 'mutates-root-'));
    sockPath = join(runtimeDir, 'd.sock');
    daemon = await startDaemon({ root: tmpRoot, sock: sockPath });
  });

  afterEach(async () => {
    await daemon?.shutdown();
    delete process.env['MUTATES_RUNTIME_DIR'];
    rmSync(runtimeDir, { recursive: true, force: true });
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('handles session.open → session.list → session.close', async () => {
    const client = await makeClient(sockPath);
    try {
      const opened = await client.call({
        id: 1,
        method: 'session.open',
        params: { root: tmpRoot },
      });
      expect('result' in opened).toBe(true);
      const openResult = (opened as { result: { sessionId: string; idleTimeoutMs: number } })
        .result;
      expect(typeof openResult.sessionId).toBe('string');
      expect(openResult.sessionId.length).toBeGreaterThan(0);

      const listed = await client.call({ id: 2, method: 'session.list', params: {} });
      const listResult = (listed as { result: Array<{ id: string; root: string }> }).result;
      expect(listResult).toHaveLength(1);
      expect(listResult[0].id).toBe(openResult.sessionId);

      const closed = await client.call({
        id: 3,
        method: 'session.close',
        params: { sessionId: openResult.sessionId },
      });
      expect((closed as { result: { ok: boolean } }).result).toEqual({ ok: true });

      const listedAfter = await client.call({ id: 4, method: 'session.list', params: {} });
      expect((listedAfter as { result: unknown[] }).result).toHaveLength(0);
    } finally {
      client.close();
    }
  });

  it('returns MethodNotFound for unregistered methods', async () => {
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call({ id: 9, method: 'no-such-method', params: {} });
      expect('error' in resp).toBe(true);
      expect((resp as { error: { code: number } }).error.code).toBe(ErrorCode.MethodNotFound);
    } finally {
      client.close();
    }
  });

  it('returns InvalidParams when session.open is missing root', async () => {
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call({ id: 1, method: 'session.open', params: {} });
      expect('error' in resp).toBe(true);
      expect((resp as { error: { code: number } }).error.code).toBe(ErrorCode.InvalidParams);
    } finally {
      client.close();
    }
  });

  it('fires the idle timer when overridden to 50ms', async () => {
    // Shutdown the default daemon and start a new one with a short timeout.
    await daemon.shutdown();
    const sockPath2 = join(runtimeDir, 'd2.sock');
    const idleFired = new Promise<void>((resolveIdle) => {
      void startDaemon({ root: tmpRoot, sock: sockPath2, idleTimeoutMs: 50 }).then((h) => {
        daemon = h;
        // Replace onIdle by overriding shutdown chain: wait for the
        // server to close as the observable side-effect of idle firing.
        h.server.on('close', resolveIdle);
        // Re-arm the timer by touching now that we have a fresh handle.
        h.manager.touch();
      });
    });
    await idleFired;
  });
});
