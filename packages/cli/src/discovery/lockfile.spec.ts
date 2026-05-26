import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { lockfilePath, read, unlink, write, type SessionLockfile } from './lockfile';

function makeLock(overrides: Partial<SessionLockfile> = {}): SessionLockfile {
  return {
    version: 1,
    pid: process.pid,
    sock: '/tmp/mutates.sock',
    root: '/tmp/project-root',
    sessionId: 'session-abc',
    startedAt: Date.now(),
    cliVersion: '0.0.0-test',
    ...overrides,
  };
}

describe('lockfile', () => {
  let runtimeDir: string;
  const root = mkdtempSync(join(tmpdir(), 'mutates-lock-root-'));

  beforeEach(() => {
    runtimeDir = mkdtempSync(join(tmpdir(), 'mutates-runtime-'));
    process.env['MUTATES_RUNTIME_DIR'] = runtimeDir;
  });

  afterEach(() => {
    delete process.env['MUTATES_RUNTIME_DIR'];
    rmSync(runtimeDir, { recursive: true, force: true });
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('lockfilePath places files under <runtime>/mutates/sessions/', () => {
    const path = lockfilePath(root);
    expect(path.startsWith(join(runtimeDir, 'mutates', 'sessions'))).toBe(true);
    expect(path.endsWith('.json')).toBe(true);
  });

  it('lockfilePath is stable for the same absolute root', () => {
    expect(lockfilePath(root)).toBe(lockfilePath(root));
  });

  it('lockfilePath differs for different roots', () => {
    const other = mkdtempSync(join(tmpdir(), 'mutates-lock-other-'));
    try {
      expect(lockfilePath(root)).not.toBe(lockfilePath(other));
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  });

  it('write + read round-trips the lockfile', () => {
    const lock = makeLock({ root });
    const path = write(lock);
    expect(existsSync(path)).toBe(true);
    const back = read(root);
    expect(back).toEqual(lock);
  });

  it('write rejects with EEXIST when another writer wins the race', () => {
    const lock = makeLock({ root });
    write(lock);
    expect(() => write(lock)).toThrow(expect.objectContaining({ code: 'EEXIST' }));
  });

  it('read returns null when the file is missing', () => {
    expect(read(root)).toBeNull();
  });

  it('read returns null for malformed JSON', () => {
    const lock = makeLock({ root });
    const path = write(lock);
    // overwrite with junk
    writeFileSync(path, 'not-json');
    expect(read(root)).toBeNull();
  });

  it('read returns null when the pid is dead (ESRCH)', async () => {
    // spawn a child that exits immediately, capture its pid post-exit.
    const child = spawn(process.execPath, ['-e', 'process.exit(0)'], {
      stdio: 'ignore',
    });
    const deadPid = child.pid as number;
    await new Promise<void>((resolve) => child.on('exit', () => resolve()));
    // small delay to ensure the OS has reaped the pid
    await new Promise((r) => setTimeout(r, 50));

    write(makeLock({ root, pid: deadPid }));
    expect(read(root)).toBeNull();
  });

  it('unlink removes the lockfile and is silent on ENOENT', () => {
    write(makeLock({ root }));
    const path = lockfilePath(root);
    expect(existsSync(path)).toBe(true);
    unlink(root);
    expect(existsSync(path)).toBe(false);
    // second unlink does not throw
    expect(() => unlink(root)).not.toThrow();
  });

  it('write writes contents readable as JSON with the documented shape', () => {
    const lock = makeLock({ root });
    const path = write(lock);
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    expect(parsed.version).toBe(1);
    expect(parsed.sessionId).toBe(lock.sessionId);
    expect(parsed.root).toBe(lock.root);
  });
});
