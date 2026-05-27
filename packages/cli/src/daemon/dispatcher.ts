import { ErrorCode } from '../proto/error-codes';
import {
  RpcError as RpcErrorClass,
  type RpcErrorResponse,
  type RpcMessage,
  type RpcRequest,
  type RpcResponse,
} from '../proto/jsonrpc';
import { diffHandler } from './handlers/diff';
import { findHandler } from './handlers/find';
import { listFilesHandler } from './handlers/list-files';
import { opHandler } from './handlers/op';
import { reloadHandler } from './handlers/reload';
import { saveHandler } from './handlers/save';
import { snapshotHandler } from './handlers/snapshot';
import type { Session, SessionManager } from './session-manager';

/**
 * Handler signature. Handlers receive the resolved session (or `null` if
 * the method does not require one — currently only `session.open` and
 * `session.list`) and the raw `params` field from the request.
 *
 * Handlers may throw an {@link RpcErrorClass} to surface a structured
 * error to the client; any other thrown value is wrapped as an
 * `InternalError`.
 */
export type Handler = (
  ctx: { manager: SessionManager; session: Session | null },
  params: unknown,
) => Promise<unknown> | unknown;

export interface DispatcherOptions {
  manager: SessionManager;
  handlers?: Record<string, Handler>;
  /**
   * Called when a client invokes `daemon.shutdown`. The daemon entry
   * wires this to its `shutdown()` handle so the process exits cleanly
   * after the response is flushed.
   */
  onShutdownRequest?: () => void;
}

/**
 * Dispatch a single JSON-RPC request to its handler.
 *
 * Reject every unregistered method with `MethodNotFound`. Catches any
 * handler throw and translates it to a JSON-RPC error response so the
 * daemon process never exits because of a user-level failure.
 */
export class Dispatcher {
  private readonly handlers = new Map<string, Handler>();
  private readonly manager: SessionManager;
  private readonly onShutdownRequest: (() => void) | null;

  constructor(opts: DispatcherOptions) {
    this.manager = opts.manager;
    this.onShutdownRequest = opts.onShutdownRequest ?? null;
    this.register('session.open', sessionOpenHandler);
    this.register('session.close', sessionCloseHandler);
    this.register('session.list', sessionListHandler);
    this.register('snapshot', snapshotHandler);
    this.register('find', findHandler);
    this.register('listFiles', listFilesHandler);
    this.register('diff', diffHandler);
    this.register('save', saveHandler);
    this.register('reload', reloadHandler);
    this.register('op', opHandler);
    this.register('daemon.shutdown', () => {
      // Defer until after this response is written so the client sees a
      // confirmation before the socket closes.
      if (this.onShutdownRequest) {
        setImmediate(() => this.onShutdownRequest?.());
      }
      return { ok: true };
    });
    for (const [name, handler] of Object.entries(opts.handlers ?? {})) {
      this.register(name, handler);
    }
  }

  register(method: string, handler: Handler): void {
    this.handlers.set(method, handler);
  }

  hasMethod(method: string): boolean {
    return this.handlers.has(method);
  }

  async dispatch(message: RpcMessage): Promise<RpcResponse | null> {
    if (!isRequest(message)) {
      // Responses or malformed envelopes — ignore (we are server-side).
      return null;
    }
    const id = message.id;
    const handler = this.handlers.get(message.method);
    if (!handler) {
      return errorResponse(id, ErrorCode.MethodNotFound, `Method not found: ${message.method}`);
    }
    // Reset idle timer on every dispatched RPC.
    this.manager.touch();

    const session = resolveSession(this.manager, message.params);
    try {
      const result = await handler({ manager: this.manager, session }, message.params);
      return { jsonrpc: '2.0', id, result };
    } catch (err) {
      if (err instanceof RpcErrorClass) {
        return errorResponse(id, err.code, err.message, err.data);
      }
      const message = err instanceof Error ? err.message : String(err);
      return errorResponse(id, ErrorCode.InternalError, message);
    }
  }
}

function isRequest(msg: RpcMessage): msg is RpcRequest {
  return (msg as RpcRequest).method !== undefined;
}

function resolveSession(manager: SessionManager, params: unknown): Session | null {
  if (params === null || typeof params !== 'object') return null;
  const sid = (params as { sessionId?: unknown }).sessionId;
  if (typeof sid !== 'string') return null;
  return manager.get(sid);
}

function errorResponse(
  id: RpcRequest['id'] | null,
  code: number,
  message: string,
  data?: unknown,
): RpcResponse {
  const error: RpcErrorResponse['error'] = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: '2.0', id, error };
}

// --- built-in session.* handlers --------------------------------------

const sessionOpenHandler: Handler = ({ manager }, params) => {
  const root = readStringParam(params, 'root', 'session.open');
  const tsconfig = readOptionalStringParam(params, 'tsconfig', 'session.open');
  const session = manager.open(root, tsconfig);
  return {
    sessionId: session.id,
    tsconfig: session.tsconfig,
    idleTimeoutMs: manager.idleTimeoutMs,
  };
};

const sessionCloseHandler: Handler = ({ manager }, params) => {
  const sessionId = readStringParam(params, 'sessionId', 'session.close');
  manager.close(sessionId);
  return { ok: true };
};

const sessionListHandler: Handler = ({ manager }) => {
  return manager.list().map((s) => ({
    id: s.id,
    root: s.root,
    ageMs: Date.now() - s.openedAt,
    unsavedFiles: s.dirtyFiles().length,
  }));
};

function readStringParam(params: unknown, key: string, method: string): string {
  if (params === null || typeof params !== 'object') {
    throw new RpcErrorClass(ErrorCode.InvalidParams, `${method}: missing params object`);
  }
  const value = (params as Record<string, unknown>)[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new RpcErrorClass(
      ErrorCode.InvalidParams,
      `${method}: missing or invalid '${key}' param`,
    );
  }
  return value;
}

function readOptionalStringParam(params: unknown, key: string, method: string): string | undefined {
  if (params === null || typeof params !== 'object') return undefined;
  const value = (params as Record<string, unknown>)[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || value.length === 0) {
    throw new RpcErrorClass(
      ErrorCode.InvalidParams,
      `${method}: invalid '${key}' param (expected non-empty string)`,
    );
  }
  return value;
}
