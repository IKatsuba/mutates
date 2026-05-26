import { mkdtempSync, rmSync } from 'node:fs';
import { stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FileStatCache } from './file-stat-cache';

async function recordFor(cache: FileStatCache, file: string): Promise<void> {
  const s = await stat(file);
  cache.record(file, { mtimeMs: s.mtimeMs, size: s.size });
}

describe('FileStatCache', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mutates-fsc-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns ok when mtime and size match', async () => {
    const file = join(dir, 'a.ts');
    await writeFile(file, 'export const a = 1;\n');
    const cache = new FileStatCache();
    await recordFor(cache, file);
    const result = await cache.verify(file, 'export const a = 1;\n');
    expect(result).toEqual({ ok: true });
  });

  it('returns ok when stat mismatches but content matches (touch)', async () => {
    const file = join(dir, 'a.ts');
    const text = 'export const a = 1;\n';
    await writeFile(file, text);
    const cache = new FileStatCache();
    await recordFor(cache, file);
    // Forge a future mtime to simulate a touch.
    const future = new Date(Date.now() + 60_000);
    await utimes(file, future, future);
    const result = await cache.verify(file, text);
    expect(result).toEqual({ ok: true });
    // Fingerprint was refreshed silently.
    const fp = cache.get(file);
    expect(fp?.mtimeMs).toBeCloseTo(future.getTime(), -1);
    expect(fp?.hash).toBeTruthy();
  });

  it('returns StaleFile when both stat and content diverge', async () => {
    const file = join(dir, 'a.ts');
    await writeFile(file, 'export const a = 1;\n');
    const cache = new FileStatCache();
    await recordFor(cache, file);
    // External writer changes content.
    await writeFile(file, 'export const a = 999;\n');
    const result = await cache.verify(file, 'export const a = 1;\n');
    expect(result).toEqual({ ok: false, reason: 'StaleFile' });
  });

  it('refreshes the fingerprint on a forgive-by-hash hit', async () => {
    const file = join(dir, 'a.ts');
    const text = 'export const a = 1;\n';
    await writeFile(file, text);
    const cache = new FileStatCache();
    await recordFor(cache, file);
    const future = new Date(Date.now() + 60_000);
    await utimes(file, future, future);
    await cache.verify(file, text);
    // A second verify with the now-current fingerprint must short-circuit.
    const second = await cache.verify(file, text);
    expect(second).toEqual({ ok: true });
  });

  it('returns StaleFile when the file no longer exists on disk', async () => {
    const cache = new FileStatCache();
    cache.record('/this/path/does/not/exist.ts', { mtimeMs: 0, size: 0 });
    const result = await cache.verify('/this/path/does/not/exist.ts', 'anything');
    expect(result).toEqual({ ok: false, reason: 'StaleFile' });
  });
});
