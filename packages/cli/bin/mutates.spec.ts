import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderUsage, runCommand } from 'citty';

import { startDaemonAndConnect } from '../src/client/rpc-client-testing';
import { read as readLockfile, unlink as unlinkLockfile } from '../src/discovery/lockfile';
import { main } from './mutates';

/**
 * Capture stdout/stderr writes during a callback. We patch `process.stdout.write`
 * because the output helpers always route through the live streams.
 */
async function capture<T>(
  fn: () => Promise<T>,
): Promise<{ stdout: string; stderr: string; value: T }> {
  const originals = {
    stdoutWrite: process.stdout.write.bind(process.stdout),
    stderrWrite: process.stderr.write.bind(process.stderr),
  };
  let stdout = '';
  let stderr = '';
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderr += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stderr.write;
  try {
    const value = await fn();
    return { stdout, stderr, value };
  } finally {
    process.stdout.write = originals.stdoutWrite;
    process.stderr.write = originals.stderrWrite;
  }
}

describe('mutates bin', () => {
  it('renders usage that mentions the binary name', async () => {
    const usage = await renderUsage(main);
    expect(usage).toContain('mutates');
  });

  it('lists the open, close, sessions subcommands in --help', async () => {
    const usage = await renderUsage(main);
    expect(usage).toContain('open');
    expect(usage).toContain('close');
    expect(usage).toContain('sessions');
  });

  it('lists the read/save commands in --help', async () => {
    const usage = await renderUsage(main);
    expect(usage).toContain('snapshot');
    expect(usage).toContain('find');
    expect(usage).toContain('diff');
    expect(usage).toContain('save');
    expect(usage).toContain('reload');
    expect(usage).toContain('list-files');
  });
});

describe('mutates bin (read-only E2E)', () => {
  let runtimeDir: string;
  let projectRoot: string;

  beforeEach(() => {
    runtimeDir = mkdtempSync(join(tmpdir(), 'mutates-runtime-'));
    process.env['MUTATES_RUNTIME_DIR'] = runtimeDir;
    projectRoot = mkdtempSync(join(tmpdir(), 'mutates-root-'));
    mkdirSync(join(projectRoot, 'src'));
    writeFileSync(
      join(projectRoot, 'src/app.ts'),
      `export class AppService {}\nexport function helper() {}\n`,
    );
  });

  afterEach(() => {
    unlinkLockfile(projectRoot);
    delete process.env['MUTATES_RUNTIME_DIR'];
    rmSync(runtimeDir, { recursive: true, force: true });
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('open → snapshot → diff (empty) flow', async () => {
    const { daemon } = await startDaemonAndConnect(projectRoot);
    try {
      const openRun = await capture(() =>
        runCommand(main, { rawArgs: ['open', '--root', projectRoot, '--json'] }),
      );
      const openResult = JSON.parse(openRun.stdout.trim()) as { sessionId: string };
      expect(typeof openResult.sessionId).toBe('string');

      const snap = await capture(() =>
        runCommand(main, {
          rawArgs: [
            'snapshot',
            join(projectRoot, 'src/app.ts'),
            '--root',
            projectRoot,
            '--session',
            openResult.sessionId,
            '--json',
          ],
        }),
      );
      const snapResult = JSON.parse(snap.stdout.trim()) as {
        entries: Array<{ kind: string }>;
      };
      expect(snapResult.entries.map((e) => e.kind)).toContain('class');
      expect(snapResult.entries.map((e) => e.kind)).toContain('function');

      const diff = await capture(() =>
        runCommand(main, {
          rawArgs: ['diff', '--root', projectRoot, '--session', openResult.sessionId, '--json'],
        }),
      );
      const diffResult = JSON.parse(diff.stdout.trim()) as Array<{ unified: string }>;
      expect(diffResult.every((d) => d.unified === '')).toBe(true);
    } finally {
      await daemon.shutdown();
    }
  });
});

describe('mutates bin (E2E with in-process daemon)', () => {
  let runtimeDir: string;
  let projectRoot: string;

  beforeEach(() => {
    runtimeDir = mkdtempSync(join(tmpdir(), 'mutates-runtime-'));
    process.env['MUTATES_RUNTIME_DIR'] = runtimeDir;
    projectRoot = mkdtempSync(join(tmpdir(), 'mutates-root-'));
  });

  afterEach(() => {
    unlinkLockfile(projectRoot);
    delete process.env['MUTATES_RUNTIME_DIR'];
    rmSync(runtimeDir, { recursive: true, force: true });
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('open → sessions list → close --all', async () => {
    const { daemon } = await startDaemonAndConnect(projectRoot);
    try {
      // mutates open --root <tmp> --json
      const openRun = await capture(() =>
        runCommand(main, { rawArgs: ['open', '--root', projectRoot, '--json'] }),
      );
      expect(openRun.stdout.trim().length).toBeGreaterThan(0);
      const openResult = JSON.parse(openRun.stdout.trim()) as { sessionId: string };
      expect(typeof openResult.sessionId).toBe('string');

      // Lockfile should exist after the session is open.
      expect(readLockfile(projectRoot)).not.toBeNull();

      // mutates sessions list --root <tmp> --json
      const listRun = await capture(() =>
        runCommand(main, {
          rawArgs: ['sessions', 'list', '--root', projectRoot, '--json'],
        }),
      );
      const listResult = JSON.parse(listRun.stdout.trim()) as Array<{ id: string }>;
      expect(listResult.some((s) => s.id === openResult.sessionId)).toBe(true);

      // mutates close --all --root <tmp> --json
      const closeRun = await capture(() =>
        runCommand(main, {
          rawArgs: ['close', '--all', '--root', projectRoot, '--json'],
        }),
      );
      const closeResult = JSON.parse(closeRun.stdout.trim()) as { closed: string[] };
      expect(closeResult.closed).toContain(openResult.sessionId);

      // After close --all, the in-process daemon still owns the lockfile
      // (until shutdown). Confirm the session list is empty.
      const listAfter = await capture(() =>
        runCommand(main, {
          rawArgs: ['sessions', 'list', '--root', projectRoot, '--json'],
        }),
      );
      expect(JSON.parse(listAfter.stdout.trim())).toEqual([]);
    } finally {
      await daemon.shutdown();
      // After daemon shutdown the lockfile must be gone.
      expect(readLockfile(projectRoot)).toBeNull();
    }
  });
});
