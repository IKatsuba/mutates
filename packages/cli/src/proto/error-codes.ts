/**
 * JSON-RPC and mutates-specific error codes.
 *
 * Numeric codes ride inside the JSON-RPC `error.code` envelope; the CLI
 * surface uses the symbolic name on stderr per Req 8.3.
 */
export const ErrorCode = {
  // JSON-RPC reserved
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  // mutates-specific
  SessionNotFound: -32001,
  StaleRef: -32002,
  StaleFile: -32003,
  NotFound: -32004,
  IoError: -32005,
  // alias of JSON-RPC InvalidParams
  InvalidInput: -32602,
} as const;

export type ErrorCodeName = keyof typeof ErrorCode;
export type ErrorCodeNumber = (typeof ErrorCode)[ErrorCodeName];

/**
 * Symbolic names exposed on the CLI surface (UPPER_SNAKE_CASE),
 * mapped from the numeric JSON-RPC code.
 *
 * Multiple symbolic names can share a code (InvalidParams / InvalidInput);
 * the surface mapping picks the canonical one. We prefer the more
 * specific `INVALID_INPUT` for arg/schema validation issues since that
 * is how the CLI describes them.
 */
const SYMBOLIC_BY_CODE: Record<number, string> = {
  [ErrorCode.ParseError]: 'PARSE_ERROR',
  [ErrorCode.InvalidRequest]: 'INVALID_REQUEST',
  [ErrorCode.MethodNotFound]: 'METHOD_NOT_FOUND',
  [ErrorCode.InvalidParams]: 'INVALID_INPUT',
  [ErrorCode.InternalError]: 'INTERNAL_ERROR',
  [ErrorCode.SessionNotFound]: 'SESSION_NOT_FOUND',
  [ErrorCode.StaleRef]: 'STALE_REF',
  [ErrorCode.StaleFile]: 'STALE_FILE',
  [ErrorCode.NotFound]: 'NOT_FOUND',
  [ErrorCode.IoError]: 'IO_ERROR',
};

/**
 * Map a numeric error code to its CLI-surface symbolic name.
 * Unknown codes fall back to `INTERNAL_ERROR`.
 */
export function toSymbolic(code: number): string {
  return SYMBOLIC_BY_CODE[code] ?? 'INTERNAL_ERROR';
}
