import { Transform, type TransformCallback } from 'node:stream';

import { ErrorCode } from './error-codes';

/** JSON-RPC 2.0 request envelope. */
export interface RpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

/** JSON-RPC 2.0 success response. */
export interface RpcSuccessResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result: unknown;
}

/** JSON-RPC 2.0 error response. */
export interface RpcErrorResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  error: { code: number; message: string; data?: unknown };
}

export type RpcResponse = RpcSuccessResponse | RpcErrorResponse;

/** Any JSON-RPC frame we can receive/send. */
export type RpcMessage = RpcRequest | RpcResponse;

/**
 * Carrier for protocol-level errors. Extends `Error` so handler code can
 * `throw new RpcError(...)` directly and the dispatcher will translate it
 * to a JSON-RPC error response.
 */
export class RpcError extends Error {
  readonly code: number;
  readonly data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'RpcError';
    this.code = code;
    this.data = data;
  }
}

/**
 * NDJSON codec for JSON-RPC frames.
 *
 * Framing: one JSON object per UTF-8 line. Each frame must not contain
 * embedded newlines (we control serialization on both ends).
 */
export class NdjsonCodec {
  /**
   * Encode a single message to its on-the-wire form (JSON + trailing `\n`).
   */
  encode(msg: RpcMessage): string {
    return JSON.stringify(msg) + '\n';
  }

  /**
   * Build a Transform stream that consumes `Buffer`/`string` chunks and
   * emits one parsed JSON object per `\n`-terminated line.
   *
   * Partial lines are buffered across `data` events. Malformed JSON lines
   * cause the stream to emit an `RpcError(ParseError)` via `error`.
   */
  decode(): Transform {
    let buffer = '';
    return new Transform({
      readableObjectMode: true,
      writableObjectMode: false,
      transform(chunk: Buffer | string, _encoding, callback: TransformCallback) {
        buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.length > 0) {
            try {
              const parsed = JSON.parse(line) as unknown;
              this.push(parsed);
            } catch (cause) {
              const err = new RpcError(ErrorCode.ParseError, 'failed to parse JSON-RPC frame', {
                line,
                cause: cause instanceof Error ? cause.message : String(cause),
              });
              callback(err);
              return;
            }
          }
          newlineIndex = buffer.indexOf('\n');
        }
        callback();
      },
      flush(callback: TransformCallback) {
        // Any trailing un-terminated content is treated as a parse error.
        if (buffer.length > 0) {
          const line = buffer;
          buffer = '';
          callback(
            new RpcError(ErrorCode.ParseError, 'unterminated JSON-RPC frame at end of stream', {
              line,
            }),
          );
          return;
        }
        callback();
      },
    });
  }
}
