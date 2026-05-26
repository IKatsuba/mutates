import type { Classified } from './classifier';

const BANNER = '// GENERATED — do not edit. Run `nx run cli:gen-commands` to refresh.';

/**
 * Emit the daemon-side handler module for a single core operation.
 *
 * Generated handlers are deliberately tiny — each is a thin wrapper that
 * extracts `target` / `data` from `params`, calls the matching
 * `@mutates/core` function inside `session.withActiveProject(...)`, and
 * (for `get*`) mints fresh refs for the returned nodes.
 *
 * Shared helpers (`resolveDeclarations`, `mintNodeRefs`) live in
 * `daemon/handlers/generated/_runtime.ts` (non-generated; hand-written).
 */
export function emitHandler(c: Classified): string {
  const handlerConst = `${c.coreName}Handler`;
  const body = renderHandlerBody(c);
  const runtimeImports: string[] = [];
  if (c.targetShape === 'nodes' || c.targetShape === 'declarations-editor') {
    runtimeImports.push('resolveDeclarations');
  }
  if (c.targetShape === 'query') {
    runtimeImports.push('mintNodeRefs');
  }
  const runtimeImport = runtimeImports.length
    ? `import { ${runtimeImports.join(', ')} } from '../_runtime';\n`
    : '';
  return `${BANNER}
import { ${c.coreName} } from '@mutates/core';

import { ErrorCode } from '../../../../proto/error-codes';
import { RpcError } from '../../../../proto/jsonrpc';
import type { Handler } from '../../../dispatcher';
${runtimeImport}
export const ${handlerConst}: Handler = ({ session }, params) => {
  if (!session) {
    throw new RpcError(ErrorCode.SessionNotFound, '${c.coreName}: session not found');
  }
  const p = (params ?? {}) as {
    target?: { file?: string; ref?: string; filter?: Record<string, unknown> };
    data?: unknown;
  };
${body}
};
`;
}

function renderHandlerBody(c: Classified): string {
  switch (c.targetShape) {
    case 'pattern':
      return `  const file = p.target?.file;
  if (typeof file !== 'string' || file.length === 0) {
    throw new RpcError(ErrorCode.InvalidInput, '${c.coreName}: target.file (glob) required');
  }
  return session.withActiveProject(() => {
    const fn = ${c.coreName} as unknown as (...args: unknown[]) => unknown;
    const result = fn(file, p.data);
    return { ok: true, result };
  });`;
    case 'query':
      return `  return session.withActiveProject(() => {
    const query = (p.target?.filter ?? p.data ?? undefined) as never;
    const fn = ${c.coreName} as unknown as (q?: unknown) => unknown;
    const result = fn(query);
    return { ok: true, result: mintNodeRefs(session, result as unknown) };
  });`;
    case 'nodes':
      return `  return session.withActiveProject(() => {
    const declarations = resolveDeclarations(session, '${c.category}', p.target);
    if (declarations.length === 0) {
      throw new RpcError(
        ErrorCode.NotFound,
        '${c.coreName}: target matched zero ${c.category}',
        { op: '${c.coreName}', target: p.target },
      );
    }
    const fn = ${c.coreName} as unknown as (...args: unknown[]) => unknown;
    const result = fn(declarations, p.data);
    return { ok: true, result };
  });`;
    case 'declarations-editor':
      return `  return session.withActiveProject(() => {
    const declarations = resolveDeclarations(session, '${c.category}', p.target);
    if (declarations.length === 0) {
      throw new RpcError(
        ErrorCode.NotFound,
        '${c.coreName}: target matched zero ${c.category}',
        { op: '${c.coreName}', target: p.target },
      );
    }
    const overrides = (p.data ?? {}) as Record<string, unknown>;
    const editor = (structure: Record<string, unknown>) => ({ ...structure, ...overrides });
    const fn = ${c.coreName} as unknown as (...args: unknown[]) => unknown;
    const result = fn(declarations, editor);
    return { ok: true, result };
  });`;
    case 'no-params':
      return `  return session.withActiveProject(() => {
    const result = (${c.coreName} as () => unknown)();
    return { ok: true, result };
  });`;
  }
}
