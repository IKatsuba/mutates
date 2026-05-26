import { readFile, stat } from 'node:fs/promises';
import xxhash, { type XXHashAPI } from 'xxhash-wasm';

/**
 * Lazy singleton accessor for the xxhash-wasm runtime. The hasher is
 * only constructed the first time mtime+size mismatch escalates to a
 * content hash; the happy-path agent loop never touches it.
 */
let hasherPromise: Promise<XXHashAPI> | null = null;
function getHasher(): Promise<XXHashAPI> {
  if (!hasherPromise) hasherPromise = xxhash();
  return hasherPromise;
}

/** Recorded fingerprint of a file at load time or after a successful save. */
export interface FileFingerprint {
  mtimeMs: number;
  size: number;
  /** Populated lazily after a mtime+size mismatch is reconciled by hash. */
  hash?: string;
}

export type VerifyResult = { ok: true } | { ok: false; reason: 'StaleFile' };

/**
 * Tracks on-disk fingerprints for in-memory source files and reconciles
 * them against the disk at save preflight.
 *
 * Verify protocol:
 *  - If `mtime+size` match, return ok.
 *  - On mismatch, compute xxhash64 of the disk content. If it matches
 *    the cached hash (or `xxhash64(inMemoryText)` when no cached hash
 *    exists yet), the file is logically unchanged — refresh the
 *    fingerprint silently and return ok. Otherwise return `StaleFile`.
 */
export class FileStatCache {
  private readonly entries = new Map<string, FileFingerprint>();

  /** Stash a fingerprint after load or save. */
  record(file: string, fp: FileFingerprint): void {
    this.entries.set(file, { ...fp });
  }

  /** Forget every recorded fingerprint. Used by tests. */
  clear(): void {
    this.entries.clear();
  }

  /** Inspect a recorded fingerprint without forcing a verify. */
  get(file: string): FileFingerprint | undefined {
    const fp = this.entries.get(file);
    return fp ? { ...fp } : undefined;
  }

  /**
   * Verify the on-disk state of `file` against the recorded fingerprint.
   *
   * `inMemoryText` is the daemon's current view of the file's contents
   * (e.g. `sourceFile.getFullText()`). If a mtime+size mismatch happens
   * but the on-disk content equals `inMemoryText`, the divergence is
   * treated as a benign touch (formatter / editor save) — we refresh
   * the fingerprint and return ok.
   */
  async verify(file: string, inMemoryText: string): Promise<VerifyResult> {
    const recorded = this.entries.get(file);
    let diskStat;
    try {
      diskStat = await stat(file);
    } catch {
      // If the file doesn't exist on disk anymore, we can never call it
      // "in sync"; surface a StaleFile so save can decline cleanly.
      return { ok: false, reason: 'StaleFile' };
    }
    const diskMtime = diskStat.mtimeMs;
    const diskSize = diskStat.size;

    if (recorded && recorded.mtimeMs === diskMtime && recorded.size === diskSize) {
      return { ok: true };
    }

    // Stat mismatch (or first time we look at the file): escalate to hash.
    const hasher = await getHasher();
    const diskBuffer = await readFile(file);
    const diskHash = hasher.h64Raw(diskBuffer).toString(16);

    let expectedHash: string;
    if (recorded?.hash) {
      expectedHash = recorded.hash;
    } else {
      // No cached hash — accept iff disk content matches our in-memory text.
      const memHash = hasher.h64Raw(Buffer.from(inMemoryText, 'utf8')).toString(16);
      expectedHash = memHash;
    }

    if (diskHash === expectedHash) {
      // Benign divergence: silently refresh mtime+size+hash and proceed.
      this.entries.set(file, {
        mtimeMs: diskMtime,
        size: diskSize,
        hash: diskHash,
      });
      return { ok: true };
    }

    return { ok: false, reason: 'StaleFile' };
  }
}
