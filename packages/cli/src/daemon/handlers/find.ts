import {
  getClasses,
  getEnums,
  getExports,
  getFunctions,
  getImports,
  getInterfaces,
  getVariables,
  type Node,
} from '@mutates/core';

import { ErrorCode } from '../../proto/error-codes';
import { RpcError } from '../../proto/jsonrpc';
import type { Handler } from '../dispatcher';

/**
 * Map a public `kind` string to the matching `get*` selector from
 * `@mutates/core`. Each selector accepts an optional query object whose
 * `pattern` field narrows by glob and other fields filter by structure.
 */
const FINDERS: Record<string, (query?: Record<string, unknown>) => Node[]> = {
  class: getClasses as unknown as (q?: Record<string, unknown>) => Node[],
  function: getFunctions as unknown as (q?: Record<string, unknown>) => Node[],
  interface: getInterfaces as unknown as (q?: Record<string, unknown>) => Node[],
  enum: getEnums as unknown as (q?: Record<string, unknown>) => Node[],
  variable: getVariables as unknown as (q?: Record<string, unknown>) => Node[],
  import: getImports as unknown as (q?: Record<string, unknown>) => Node[],
  export: getExports as unknown as (q?: Record<string, unknown>) => Node[],
};

/**
 * `find` handler — `{ kind, query }`. Returns an array of
 * `{ ref, kind, name?, file }` so the agent can drill straight into a
 * matched node by ref.
 */
export const findHandler: Handler = ({ session }, params) => {
  if (!session) {
    throw new RpcError(ErrorCode.SessionNotFound, 'find: session not found');
  }
  if (params === null || typeof params !== 'object') {
    throw new RpcError(ErrorCode.InvalidParams, 'find: missing params');
  }
  const { kind, query } = params as { kind?: string; query?: Record<string, unknown> };
  if (typeof kind !== 'string' || kind.length === 0) {
    throw new RpcError(ErrorCode.InvalidParams, 'find: missing kind');
  }
  const finder = FINDERS[kind];
  if (!finder) {
    throw new RpcError(ErrorCode.InvalidParams, `find: unsupported kind "${kind}"`, { kind });
  }

  return session.withActiveProject(() => {
    const nodes = finder(query ?? {});
    return nodes.map((node) => {
      const file = node.getSourceFile().getFilePath();
      const ref = session.refs.mint(node, file);
      const name = readName(node);
      const result: { ref: string; kind: string; file: string; name?: string } = {
        ref,
        kind,
        file,
      };
      if (name) result.name = name;
      return result;
    });
  });
};

function readName(node: Node): string | undefined {
  const candidate = (node as unknown as { getName?: () => string | undefined }).getName;
  if (typeof candidate === 'function') {
    try {
      const name = candidate.call(node);
      if (typeof name === 'string' && name.length > 0) return name;
    } catch {
      // Some nodes legitimately have no name.
    }
  }
  return undefined;
}
