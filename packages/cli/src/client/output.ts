import { ErrorCode, toSymbolic } from '../proto/error-codes';
import { RpcError } from '../proto/jsonrpc';

/**
 * CLI exit codes per design.md §Error Handling. Keep in sync with the
 * symbolic-name surface; `INTERNAL_ERROR` defaults to 1 like a generic
 * unhandled failure.
 */
const EXIT_CODE_BY_SYMBOLIC: Record<string, number> = {
  INTERNAL_ERROR: 1,
  INVALID_INPUT: 2,
  NOT_FOUND: 3,
  SESSION_NOT_FOUND: 4,
  STALE_REF: 5,
  STALE_FILE: 6,
  IO_ERROR: 7,
};

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

/** Convert an `RpcError` into the surface payload required by Req 8.3. */
export function errorPayload(err: RpcError): ErrorPayload {
  const payload: ErrorPayload = {
    code: toSymbolic(err.code),
    message: err.message,
  };
  if (err.data !== undefined) payload.details = err.data;
  return payload;
}

/** Map an error's symbolic name to its CLI exit code. */
export function exitCodeFor(err: RpcError): number {
  const symbolic = toSymbolic(err.code);
  return EXIT_CODE_BY_SYMBOLIC[symbolic] ?? 1;
}

/**
 * Render an error to stderr as JSON (one line, machine-parseable). The
 * caller is responsible for `process.exit(exitCodeFor(err))` afterwards.
 *
 * Non-`RpcError` throws are wrapped as `INTERNAL_ERROR` so the CLI
 * always emits the documented shape.
 */
export function renderError(err: unknown, stream: NodeJS.WritableStream = process.stderr): void {
  const rpcErr =
    err instanceof RpcError
      ? err
      : new RpcError(ErrorCode.InternalError, err instanceof Error ? err.message : String(err));
  stream.write(JSON.stringify(errorPayload(rpcErr)) + '\n');
}

/**
 * Render a result to stdout. `text` format uses a human-friendly
 * stringification (`String(result)` for primitives, `JSON.stringify`
 * with indent for objects); `json` always uses single-line JSON for
 * pipe-friendliness.
 */
export function renderResult(
  result: unknown,
  format: 'text' | 'json' = 'text',
  stream: NodeJS.WritableStream = process.stdout,
): void {
  if (format === 'json') {
    stream.write(JSON.stringify(result) + '\n');
    return;
  }
  if (result === undefined || result === null) {
    stream.write('\n');
    return;
  }
  if (typeof result === 'string') {
    stream.write(result.endsWith('\n') ? result : result + '\n');
    return;
  }
  if (typeof result === 'number' || typeof result === 'boolean') {
    stream.write(String(result) + '\n');
    return;
  }
  stream.write(JSON.stringify(result, null, 2) + '\n');
}
