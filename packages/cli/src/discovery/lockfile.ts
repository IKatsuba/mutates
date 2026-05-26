import { createHash } from 'node:crypto';
import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/**
 * Lockfile shape written by the daemon and read by the client per
 * `design.md` §"Lockfile". The `version` field is reserved for future
 * envelope changes; readers should treat unknown versions as stale.
 */
export interface SessionLockfile {
  version: 1;
  pid: number;
  sock: string;
  root: string;
  sessionId: string;
  startedAt: number;
  cliVersion: string;
}

/**
 * Return the runtime base dir under which session lockfiles live.
 * Prefers `$XDG_RUNTIME_DIR/mutates/sessions/` on Unix (so the dir
 * survives across logins of the same user but not across reboots),
 * falling back to `os.tmpdir()/mutates/sessions/`. Allows `MUTATES_RUNTIME_DIR`
 * to win for tests.
 */
function lockfileDir(): string {
  const override = process.env['MUTATES_RUNTIME_DIR'];
  if (override) return join(override, 'mutates', 'sessions');
  const xdg = process.env['XDG_RUNTIME_DIR'];
  if (xdg) return join(xdg, 'mutates', 'sessions');
  return join(tmpdir(), 'mutates', 'sessions');
}

/**
 * Stable lockfile path for the given project root. The root is resolved
 * to an absolute path and hashed (sha256, first 16 hex chars) so that
 * two paths only collide if they refer to the same project.
 */
export function lockfilePath(root: string): string {
  const abs = resolve(root);
  const hash = createHash('sha256').update(abs).digest('hex').slice(0, 16);
  return join(lockfileDir(), `${hash}.json`);
}

/**
 * Detect whether a pid points to a live process. We use
 * `process.kill(pid, 0)` as a signal-zero probe; the docs guarantee it
 * does not deliver a signal but does perform the permission/existence
 * check. `ESRCH` → process gone; `EPERM` → process exists but owned by
 * someone else (still alive for our purposes).
 */
function isAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') return false;
    // EPERM means the process exists but we cannot signal it — still alive.
    return code === 'EPERM';
  }
}

/**
 * Write the lockfile atomically using `O_EXCL | O_CREAT`. Throws with
 * `code === 'EEXIST'` if another writer won the race; callers should
 * fall back to reading the existing file.
 */
export function write(lock: SessionLockfile): string {
  const path = lockfilePath(lock.root);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  // O_WRONLY | O_CREAT | O_EXCL — fail if file exists.
  // Numeric flags: O_WRONLY=1, O_CREAT=64, O_EXCL=128 on Linux but vary.
  // Use Node's `fs.constants` via string flag `'wx'` which maps to the same.
  const fd = openSync(path, 'wx', 0o600);
  try {
    writeFileSync(fd, JSON.stringify(lock));
  } finally {
    closeSync(fd);
  }
  return path;
}

/**
 * Read the lockfile for `root`. Returns `null` when:
 *   - the file does not exist
 *   - the JSON is malformed or version unknown
 *   - the recorded pid is no longer alive
 *
 * Stale lockfiles are NOT removed here (avoiding TOCTOU surprises in
 * concurrent invocations); callers that want to reclaim the slot should
 * call {@link unlink}.
 */
export function read(root: string): SessionLockfile | null {
  const path = lockfilePath(root);
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isSessionLockfile(parsed)) return null;
  if (!isAlive(parsed.pid)) return null;
  return parsed;
}

/** Remove the lockfile for `root`. Silent on ENOENT. */
export function unlink(root: string): void {
  const path = lockfilePath(root);
  try {
    unlinkSync(path);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

function isSessionLockfile(value: unknown): value is SessionLockfile {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v['version'] === 1 &&
    typeof v['pid'] === 'number' &&
    typeof v['sock'] === 'string' &&
    typeof v['root'] === 'string' &&
    typeof v['sessionId'] === 'string' &&
    typeof v['startedAt'] === 'number' &&
    typeof v['cliVersion'] === 'string'
  );
}
