import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';

export const DEFAULT_IDLE_TIMEOUT_MS = 600_000;

/**
 * Placeholder Session — the real ts-morph–backed `Session` class lands in
 * Group C. At this stage we only model the metadata the dispatcher needs
 * for `session.open` / `session.list` / `session.close` to behave
 * correctly end-to-end.
 */
export interface Session {
  readonly id: string;
  readonly root: string;
  readonly openedAt: number;
  /** Absolute path to the project's tsconfig.json, or null if none. */
  readonly tsconfig: string | null;
}

export interface SessionManagerOptions {
  /**
   * Idle timeout in ms. Defaults to {@link DEFAULT_IDLE_TIMEOUT_MS}; a
   * caller passing `0` disables the timer.
   */
  idleTimeoutMs?: number;
  /**
   * Callback invoked when the idle timer fires. The daemon entry wires
   * this to graceful shutdown (drain + lockfile unlink + exit).
   */
  onIdle?: () => void;
}

/**
 * Per-daemon session bookkeeping.
 *
 * The daemon process owns at most one Session at a time (one project
 * root per daemon — Req 10.1); we keep a Map keyed by sessionId
 * regardless so the API remains forward-compatible.
 */
export class SessionManager {
  readonly idleTimeoutMs: number;
  private readonly onIdle: () => void;
  private readonly sessions = new Map<string, Session>();
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(opts: SessionManagerOptions = {}) {
    this.idleTimeoutMs = opts.idleTimeoutMs ?? readEnvTimeout() ?? DEFAULT_IDLE_TIMEOUT_MS;
    this.onIdle = opts.onIdle ?? (() => undefined);
  }

  open(root: string): Session {
    const abs = resolvePath(root);
    const candidate = join(abs, 'tsconfig.json');
    const session: Session = {
      id: randomUUID(),
      root: abs,
      openedAt: Date.now(),
      tsconfig: existsSync(candidate) ? candidate : null,
    };
    this.sessions.set(session.id, session);
    this.touch();
    return session;
  }

  close(id: string): void {
    this.sessions.delete(id);
    this.touch();
  }

  get(id: string): Session | null {
    return this.sessions.get(id) ?? null;
  }

  list(): Session[] {
    return [...this.sessions.values()];
  }

  /** Reset the idle timer. Called on every dispatched RPC. */
  touch(): void {
    if (this.idleTimeoutMs <= 0) return;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      this.onIdle();
    }, this.idleTimeoutMs);
    // Don't keep the event loop alive solely for the idle timer.
    this.idleTimer.unref?.();
  }

  /** Stop the idle timer; used by the daemon during shutdown. */
  stop(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}

function readEnvTimeout(): number | null {
  const raw = process.env['MUTATES_IDLE_TIMEOUT'];
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}
