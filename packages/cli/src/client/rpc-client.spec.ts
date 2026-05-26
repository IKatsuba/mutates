import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  lockfilePath,
  read as readLockfile,
  unlink as unlinkLockfile,
} from '../discovery/lockfile';
import { ErrorCode } from '../proto/error-codes';
import { RpcError } from '../proto/jsonrpc';
import { connectClient, deriveSocketPath } from './rpc-client';
import { startDaemonAndConnect } from './rpc-client-testing';

describe('deriveSocketPath', () => {
  it('produces a stable path per absolute root', () => {
    expect(deriveSocketPath('/some/root/a')).toBe(deriveSocketPath('/some/root/a'));
  });

  it('produces distinct paths for distinct roots', () => {
    expect(deriveSocketPath('/some/root/a')).not.toBe(deriveSocketPath('/some/root/b'));
  });

  it('returns a Unix socket path on non-windows platforms', () => {
    if (process.platform === 'win32') return;
    expect(deriveSocketPath('/foo').startsWith(tmpdir())).toBe(true);
    expect(deriveSocketPath('/foo').endsWith('.sock')).toBe(true);
  });
});

describe('connectClient (in-process daemon)', () => {
  let runtimeDir: string;
  let projectRoot: string;

  beforeEach(() => {
    runtimeDir = mkdtempSync(join(tmpdir(), 'mutates-runtime-'));
    process.env['MUTATES_RUNTIME_DIR'] = runtimeDir;
    projectRoot = mkdtempSync(join(tmpdir(), 'mutates-root-'));
  });

  afterEach(async () => {
    unlinkLockfile(projectRoot);
    delete process.env['MUTATES_RUNTIME_DIR'];
    rmSync(runtimeDir, { recursive: true, force: true });
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('connects to a live daemon, opens a session, then closes', async () => {
    const { daemon, sockPath } = await startDaemonAndConnect(projectRoot);
    try {
      // After startDaemonAndConnect, the lockfile is present.
      const lock = readLockfile(projectRoot);
      expect(lock).not.toBeNull();
      expect(lock?.sock).toBe(sockPath);
      expect(lockfilePath(projectRoot).endsWith('.json')).toBe(true);

      const conn = await connectClient({ root: projectRoot });

      const opened = await conn.call<{ sessionId: string }>('session.open', {
        root: projectRoot,
      });
      expect(typeof opened.sessionId).toBe('string');

      const list = await conn.call<Array<{ id: string }>>('session.list', {});
      expect(list).toHaveLength(1);

      await conn.call('session.close', { sessionId: opened.sessionId });
      await conn.close();
    } finally {
      await daemon.shutdown();
    }
  });

  it('throws SessionNotFound when sessionId is invalid', async () => {
    const { daemon } = await startDaemonAndConnect(projectRoot);
    try {
      await expect(
        connectClient({ root: projectRoot, sessionId: 'does-not-exist' }),
      ).rejects.toMatchObject({
        name: 'RpcError',
        code: ErrorCode.SessionNotFound,
      });
    } finally {
      await daemon.shutdown();
    }
  });

  it('propagates handler errors as RpcError on the client side', async () => {
    const { daemon } = await startDaemonAndConnect(projectRoot);
    try {
      const conn = await connectClient({ root: projectRoot });
      try {
        await conn.call('does.not.exist', {});
        throw new Error('expected MethodNotFound');
      } catch (err) {
        expect(err).toBeInstanceOf(RpcError);
        expect((err as RpcError).code).toBe(ErrorCode.MethodNotFound);
      } finally {
        await conn.close();
      }
    } finally {
      await daemon.shutdown();
    }
  });

  // TODO(task 33 / final checkpoint): exercise the full spawn path
  // against the compiled `dist/packages/cli/src/daemon/entry.js`. The
  // raw-source path through ts-node currently conflicts with the
  // monorepo's `module: NodeNext` setting; the spawned daemon must
  // therefore wait until we have a stable built artefact under test.
  it.skip('spawns a real daemon binary from a tmpdir (post-build)', () => {
    // intentional — see TODO above.
    void resolve;
  });
});
