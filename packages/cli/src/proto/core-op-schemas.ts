import type { OpSchema } from '../generated/op-schemas';

/**
 * JSON Schemas for the hand-written "core" ops that the codegen does not
 * touch (everything that isn't `add*` / `edit*` / `remove*` / `get*`).
 *
 * Shape mirrors the entries produced by `scripts/gen-commands/emit-schema.ts`
 * so `mutates schema` can merge both maps and present a single, uniform
 * catalogue to agents. `targetShape` is set to a free-form label that
 * describes the param structure — these ops don't take the standard
 * `{ target, data }` envelope.
 */
const DRAFT = 'https://json-schema.org/draft/2020-12/schema';

function obj(
  title: string,
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> {
  return {
    $schema: DRAFT,
    title,
    type: 'object',
    properties,
    required,
    additionalProperties: true,
  };
}

const sessionId = { type: 'string', description: 'Session id minted by session.open' };
const filePath = { type: 'string', description: 'Absolute file path' };

export const CORE_OP_SCHEMAS: Record<string, OpSchema> = {
  'session.open': {
    op: 'session.open',
    verb: 'open',
    category: 'session',
    targetShape: 'session-params',
    schema: obj(
      'session.open',
      {
        root: { type: 'string', description: 'Project root (absolute path)' },
        tsconfig: {
          type: 'string',
          description:
            'Optional path to a leaf tsconfig (absolute or relative to root). Overrides <root>/tsconfig.json',
        },
      },
      ['root'],
    ),
  },
  'session.close': {
    op: 'session.close',
    verb: 'close',
    category: 'session',
    targetShape: 'session-params',
    schema: obj('session.close', { sessionId }, ['sessionId']),
  },
  'session.list': {
    op: 'session.list',
    verb: 'list',
    category: 'session',
    targetShape: 'no-params',
    schema: obj('session.list', {}),
  },
  snapshot: {
    op: 'snapshot',
    verb: 'snapshot',
    category: 'core',
    targetShape: 'file-or-ref',
    schema: obj(
      'snapshot',
      {
        sessionId,
        target: {
          type: 'object',
          properties: {
            file: { ...filePath, description: 'Absolute file path to walk' },
            ref: { type: 'string', description: 'Parent ref (@nN) to drill into' },
          },
          oneOf: [{ required: ['file'] }, { required: ['ref'] }],
          additionalProperties: false,
        },
      },
      ['target'],
    ),
  },
  find: {
    op: 'find',
    verb: 'find',
    category: 'core',
    targetShape: 'kind-query',
    schema: obj(
      'find',
      {
        sessionId,
        kind: {
          type: 'string',
          enum: ['class', 'function', 'interface', 'enum', 'type', 'variable', 'import', 'export'],
        },
        query: {
          type: 'object',
          description: 'Optional structural filter, e.g. { pattern, name, ... }',
          additionalProperties: true,
        },
      },
      ['kind'],
    ),
  },
  diff: {
    op: 'diff',
    verb: 'diff',
    category: 'core',
    targetShape: 'optional-file',
    schema: obj('diff', {
      sessionId,
      file: { ...filePath, description: 'Limit diff to one file (omit for every dirty file)' },
    }),
  },
  save: {
    op: 'save',
    verb: 'save',
    category: 'core',
    targetShape: 'optional-file',
    schema: obj('save', {
      sessionId,
      file: { ...filePath, description: 'Save just this file (omit to flush every dirty file)' },
    }),
  },
  reload: {
    op: 'reload',
    verb: 'reload',
    category: 'core',
    targetShape: 'file',
    schema: obj('reload', { sessionId, file: filePath }, ['file']),
  },
  listFiles: {
    op: 'listFiles',
    verb: 'list',
    category: 'core',
    targetShape: 'optional-glob',
    schema: obj('listFiles', {
      sessionId,
      glob: { type: 'string', description: 'Optional glob to narrow the listed files' },
    }),
  },
};
