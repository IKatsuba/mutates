import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';

import { OP_SCHEMAS } from '../../generated/op-schemas';
import { ErrorCode } from '../../proto/error-codes';
import { RpcError } from '../../proto/jsonrpc';
import type { Handler } from '../dispatcher';
import { GENERATED_HANDLERS } from './generated';

/**
 * Lazily compile JSON Schemas once per process — every op has a fixed
 * schema, so compiling per-request would waste milliseconds in a hot
 * agent loop. Ajv with strict mode off because our generated schemas
 * include vendor extensions (description on free-form objects) we want
 * to allow.
 */
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validators = new Map<string, ValidateFunction>();

function getValidator(op: string): ValidateFunction | null {
  const entry = OP_SCHEMAS[op];
  if (!entry) return null;
  let v = validators.get(op);
  if (!v) {
    v = ajv.compile(entry.schema);
    validators.set(op, v);
  }
  return v;
}

interface OpParams {
  op?: unknown;
  target?: unknown;
  data?: unknown;
  sessionId?: unknown;
}

/**
 * `op` dispatcher handler.
 *
 * Single entry-point for every generated mutate/query op. Validates the
 * `{ target, data }` payload against the op's JSON Schema, delegates to
 * the generated per-op handler via {@link GENERATED_HANDLERS}, and (for
 * mutating ops) invalidates refs on every dirty file before returning
 * `{ ok: true, mutated: [...] }`.
 *
 * Missing op name → `InvalidInput`. Unknown op → `NotFound`. Schema
 * failure → `InvalidInput` with the Ajv error array as `data`.
 */
export const opHandler: Handler = async (ctx, params) => {
  const { session } = ctx;
  if (!session) {
    throw new RpcError(ErrorCode.SessionNotFound, 'op: session not found');
  }
  const p = (params ?? {}) as OpParams;
  const op = p.op;
  if (typeof op !== 'string' || op.length === 0) {
    throw new RpcError(ErrorCode.InvalidInput, 'op: missing or invalid op name');
  }

  const handler = GENERATED_HANDLERS[op];
  if (!handler) {
    throw new RpcError(ErrorCode.NotFound, `op: unknown op "${op}"`, { op });
  }

  const validator = getValidator(op);
  if (validator) {
    const payload = { target: p.target, data: p.data };
    if (!validator(payload)) {
      throw new RpcError(
        ErrorCode.InvalidInput,
        `op: payload failed schema validation for "${op}"`,
        { op, errors: validator.errors ?? [] },
      );
    }
  }

  const result = await session.withActiveProject(() => handler(ctx, { ...p }));

  const mutated = session.dirtyFiles();
  for (const file of mutated) {
    session.refs.invalidateFile(file);
  }
  return { ok: true, result, mutated };
};
