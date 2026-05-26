import type { Classified } from './classifier';

/**
 * JSON Schema (Draft 2020-12) for a single op's `params.data` payload.
 *
 * The classifier doesn't statically extract the per-op structure shape
 * (the ts-morph structure types are intricate unions and would balloon
 * the generated schema). Instead we emit a permissive
 * `additionalProperties: true` object with `type: 'object'` (or `array`
 * for batched structures) — agents are expected to consult the
 * ts-morph `*Structure` types via `mutates skills get core`.
 *
 * Validation is intentionally light: we reject obviously wrong payloads
 * (non-object, missing required filters) but pass through arbitrary
 * structure keys to ts-morph, which is itself the authoritative type
 * checker for that surface.
 */
export interface OpSchema {
  op: string;
  verb: string;
  category: string;
  targetShape: string;
  /** JSON Schema for `params` of the `op` request. */
  schema: Record<string, unknown>;
}

export function emitSchema(c: Classified): OpSchema {
  return {
    op: c.coreName,
    verb: c.verb,
    category: c.category,
    targetShape: c.targetShape,
    schema: buildSchema(c),
  };
}

function buildSchema(c: Classified): Record<string, unknown> {
  const target = targetSchema(c);
  const data = dataSchema(c);
  const required = ['target'];
  if (
    c.targetShape === 'pattern' ||
    c.targetShape === 'nodes' ||
    c.targetShape === 'declarations-editor'
  ) {
    required.push('data');
  }
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: c.coreName,
    type: 'object',
    properties: { target, data },
    required,
    additionalProperties: true,
  };
}

function targetSchema(c: Classified): Record<string, unknown> {
  switch (c.targetShape) {
    case 'pattern':
      return {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Glob pattern of target source files' },
        },
        required: ['file'],
        additionalProperties: true,
      };
    case 'query':
      return {
        type: 'object',
        properties: {
          filter: { type: 'object', description: 'Optional structure-match query' },
        },
        additionalProperties: true,
      };
    case 'no-params':
      return { type: 'object', additionalProperties: false };
    case 'nodes':
    case 'declarations-editor':
    default:
      return {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'Node ref (@nN) — alternative to file+filter' },
          file: { type: 'string', description: 'Glob pattern; combine with filter to scope nodes' },
          filter: { type: 'object', description: 'Structure-match query for narrowing nodes' },
        },
        anyOf: [{ required: ['ref'] }, { required: ['file'] }],
        additionalProperties: true,
      };
  }
}

function dataSchema(c: Classified): Record<string, unknown> {
  if (c.targetShape === 'query' || c.targetShape === 'no-params') {
    return { description: 'Not used for this op (target carries the query)' };
  }
  // Per-op data is forwarded straight to ts-morph's structure builders, which
  // will silently coerce nonsense (`name: 42`) into a class without a name.
  // We enumerate the well-known scalar properties so AJV catches the obvious
  // shape errors before ts-morph ever runs.
  const objectSchema = {
    type: 'object',
    properties: COMMON_STRUCTURE_PROPS,
    additionalProperties: true,
  };
  // `add*` may take a single structure or an array; the others always take a
  // single object override. We use `oneOf` so callers may pass either shape
  // and the core function `coerceArray`s it server-side.
  if (c.verb === 'add') {
    return {
      oneOf: [objectSchema, { type: 'array', items: objectSchema }],
    };
  }
  return objectSchema;
}

/**
 * Common scalar properties used across ts-morph `*Structure` types.
 * The keys not listed here remain unvalidated (`additionalProperties:
 * true`), but for these ones AJV will reject the wrong primitive type
 * before the structure ever reaches ts-morph.
 */
const COMMON_STRUCTURE_PROPS: Record<string, unknown> = {
  name: { type: 'string' },
  text: { type: 'string' },
  type: { type: 'string' },
  returnType: { type: 'string' },
  initializer: { type: 'string' },
  moduleSpecifier: { type: 'string' },
  namespaceImport: { type: 'string' },
  defaultImport: { type: 'string' },
  isExported: { type: 'boolean' },
  isDefaultExport: { type: 'boolean' },
  isAbstract: { type: 'boolean' },
  isAsync: { type: 'boolean' },
  isGenerator: { type: 'boolean' },
  isStatic: { type: 'boolean' },
  isReadonly: { type: 'boolean' },
  isOptional: { type: 'boolean' },
  hasQuestionToken: { type: 'boolean' },
  hasExclamationToken: { type: 'boolean' },
  hasOverrideKeyword: { type: 'boolean' },
  hasDeclareKeyword: { type: 'boolean' },
  isExportEquals: { type: 'boolean' },
  isTypeOnly: { type: 'boolean' },
  declarationKind: { type: 'string' },
  scope: { type: 'string' },
  kind: { type: ['string', 'number'] },
  extends: {
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  },
  implements: {
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  },
};
