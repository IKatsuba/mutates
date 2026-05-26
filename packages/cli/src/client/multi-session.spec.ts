import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { listAll, unlink as unlinkLockfile } from '../discovery/lockfile';
import { connectClient } from './rpc-client';
import { startDaemonAndConnect } from './rpc-client-testing';

/**
 * Task 30 — multi-session coverage.
 *
 * Two daemons live on two distinct project roots inside one shared
 * runtime dir. `mutates sessions list --root <A>` and `--root <B>`
 * each talk to their own daemon over its lockfile-derived socket; the
 * `--all` flag bypasses the daemon entirely and enumerates every live
 * lockfile in the runtime dir (Req 10.1, 10.2).
 *
 * Deviation note: as in idle-timeout.spec.ts, we use the in-process
 * `startDaemonAndConnect` helper because the workspace's
 * `@mutates/core` symlink cannot resolve in a spawned `node` process.
 */
describe('multi-session — two daemons on one runtime dir', () => {
  let runtimeDir: string;
  let rootA: string;
  let rootB: string;

  beforeEach(() => {
    runtimeDir = mkdtempSync(join(tmpdir(), 'mutates-runtime-'));
    process.env['MUTATES_RUNTIME_DIR'] = runtimeDir;
    rootA = mkdtempSync(join(tmpdir(), 'mutates-root-a-'));
    rootB = mkdtempSync(join(tmpdir(), 'mutates-root-b-'));
  });

  afterEach(() => {
    unlinkLockfile(rootA);
    unlinkLockfile(rootB);
    delete process.env['MUTATES_RUNTIME_DIR'];
    rmSync(runtimeDir, { recursive: true, force: true });
    rmSync(rootA, { recursive: true, force: true });
    rmSync(rootB, { recursive: true, force: true });
  });

  it('isolates per-root session.list while listAll() surfaces both', async () => {
    const a = await startDaemonAndConnect(rootA);
    const b = await startDaemonAndConnect(rootB);
    try {
      const connA = await connectClient({ root: rootA });
      const connB = await connectClient({ root: rootB });
      try {
        await connA.call('session.open', { root: rootA });
        await connB.call('session.open', { root: rootB });

        const listA = await connA.call<Array<{ root: string }>>('session.list', {});
        const listB = await connB.call<Array<{ root: string }>>('session.list', {});

        expect(listA).toHaveLength(1);
        expect(listA[0].root).toBe(rootA);
        expect(listB).toHaveLength(1);
        expect(listB[0].root).toBe(rootB);

        // --all path: read straight from the lockfile dir.
        const all = listAll();
        const roots = all.map((l) => l.root).sort();
        expect(roots).toEqual([rootA, rootB].sort());
      } finally {
        await connA.close();
        await connB.close();
      }
    } finally {
      await a.daemon.shutdown();
      await b.daemon.shutdown();
    }
  });

  it('listAll() ignores stale lockfiles (dead pid)', async () => {
    const a = await startDaemonAndConnect(rootA);
    try {
      // Write a bogus lockfile for rootB pointing at a definitely-dead pid.
      const { write: writeLockfile } = await import('../discovery/lockfile');
      writeLockfile({
        version: 1,
        pid: 999_999_999,
        sock: join(runtimeDir, 'b.sock'),
        root: rootB,
        sessionId: '',
        startedAt: Date.now(),
        cliVersion: 'test',
      });

      const all = listAll();
      const roots = all.map((l) => l.root);
      expect(roots).toContain(rootA);
      expect(roots).not.toContain(rootB);
    } finally {
      await a.daemon.shutdown();
    }
  });
});
