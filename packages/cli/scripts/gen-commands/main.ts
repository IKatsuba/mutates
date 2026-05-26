/* eslint-disable no-console */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { Project } from 'ts-morph';

import { classify, type Classified } from './classifier';
import { emitCommand } from './emit-command';
import { emitHandler } from './emit-handler';
import { emitSchema } from './emit-schema';

const REPO_ROOT = resolve(__dirname, '../../../..');
const CLI_ROOT = resolve(__dirname, '../..');

interface RunOptions {
  /** Override the output directory. Used by the `:check` mode. */
  outRoot?: string;
}

/**
 * Walk @mutates/core's exported add* / edit* / remove* / get* functions and
 * emit, for each:
 *
 *   - a daemon handler under `src/daemon/handlers/generated/<category>/<verb>.ts`,
 *   - a citty subcommand under `src/commands/generated/<category>/<verb>.ts`,
 *   - a JSON Schema entry registered in `src/generated/op-schemas.ts`.
 *
 * Plus two indexes (`generated/handlers/index.ts`, `generated/commands/index.ts`)
 * and a tracked manifest (`src/generated/.manifest.json`) listing the file
 * names — the CI `:check` mode re-runs us into a tmp dir and diffs against
 * this manifest, so drift in the generator is caught even though the
 * .ts artefacts themselves are gitignored.
 */
export function run(opts: RunOptions = {}): {
  outRoot: string;
  manifest: ManifestEntry[];
  count: number;
} {
  const outRoot = opts.outRoot ?? CLI_ROOT;
  const project = openCoreProject();
  const classified = classify(project);

  const handlersDir = join(outRoot, 'src/daemon/handlers/generated');
  const commandsDir = join(outRoot, 'src/commands/generated');
  const generatedDir = join(outRoot, 'src/generated');

  // Wipe previous run so the manifest is exact.
  // Note: only remove this generator's own files inside `src/generated/`
  // — sibling codegens (e.g. `gen-skills`) write there too and we must
  // not clobber their output regardless of target execution order.
  rmSync(handlersDir, { recursive: true, force: true });
  rmSync(commandsDir, { recursive: true, force: true });
  rmSync(join(generatedDir, 'op-schemas.ts'), { force: true });
  rmSync(join(generatedDir, '.manifest.json'), { force: true });

  ensureDir(handlersDir);
  ensureDir(commandsDir);
  ensureDir(generatedDir);

  const manifest: ManifestEntry[] = [];

  // 1. Per-op handlers and commands.
  for (const c of classified) {
    const handlerFile = join(handlersDir, c.category, `${c.verb}.ts`);
    const commandFile = join(commandsDir, c.category, `${c.verb}.ts`);
    ensureDir(dirname(handlerFile));
    ensureDir(dirname(commandFile));
    writeFileSync(handlerFile, emitHandler(c));
    writeFileSync(commandFile, emitCommand(c));
    manifest.push({
      op: c.coreName,
      verb: c.verb,
      category: c.category,
      targetShape: c.targetShape,
      handler: relative(outRoot, handlerFile),
      command: relative(outRoot, commandFile),
    });
  }

  // 2. Schemas as a single module.
  writeFileSync(join(generatedDir, 'op-schemas.ts'), emitSchemasModule(classified));

  // 3. Runtime helpers used by every generated handler (hand-written
  //    stub generated in place so the gitignored tree is self-contained).
  writeFileSync(join(handlersDir, '_runtime.ts'), runtimeHelpersSource());

  // 4. Handler / command indexes.
  writeFileSync(join(handlersDir, 'index.ts'), emitHandlerIndex(classified));
  writeFileSync(join(commandsDir, 'index.ts'), emitCommandIndex(classified));

  // 5. Tracked manifest (this file IS committed even though .ts files are not).
  const sortedManifest = [...manifest].sort((a, b) => a.op.localeCompare(b.op));
  writeFileSync(
    join(generatedDir, '.manifest.json'),
    JSON.stringify({ count: sortedManifest.length, ops: sortedManifest }, null, 2) + '\n',
  );

  return { outRoot, manifest: sortedManifest, count: classified.length };
}

export interface ManifestEntry {
  op: string;
  verb: string;
  category: string;
  targetShape: string;
  handler: string;
  command: string;
}

function ensureDir(p: string): void {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function openCoreProject(): Project {
  return new Project({
    tsConfigFilePath: resolve(REPO_ROOT, 'packages/core/tsconfig.lib.json'),
    skipAddingFilesFromTsConfig: false,
  });
}

function emitSchemasModule(classified: Classified[]): string {
  const entries = classified.map((c) => {
    const s = emitSchema(c);
    return `  ${JSON.stringify(c.coreName)}: ${JSON.stringify(s, null, 2).replace(/\n/g, '\n  ')}`;
  });
  return `// GENERATED — do not edit. Run \`nx run cli:gen-commands\` to refresh.
export interface OpSchema {
  op: string;
  verb: string;
  category: string;
  targetShape: string;
  schema: Record<string, unknown>;
}

export const OP_SCHEMAS: Record<string, OpSchema> = {
${entries.join(',\n')}
};
`;
}

function emitHandlerIndex(classified: Classified[]): string {
  const imports = classified
    .map((c) => `import { ${c.coreName}Handler } from './${c.category}/${c.verb}';`)
    .join('\n');
  const map = classified
    .map((c) => `  ${JSON.stringify(c.coreName)}: ${c.coreName}Handler,`)
    .join('\n');
  return `// GENERATED — do not edit. Run \`nx run cli:gen-commands\` to refresh.
import type { Handler } from '../../dispatcher';

${imports}

export const GENERATED_HANDLERS: Record<string, Handler> = {
${map}
};
`;
}

function emitCommandIndex(classified: Classified[]): string {
  const entries = classified
    .map(
      (c) =>
        `  ${JSON.stringify(`${c.verb}-${c.category}`)}: () => import('./${c.category}/${c.verb}').then((m) => m.default),`,
    )
    .join('\n');
  // citty's CommandDef is generic over the args shape; using the
  // specific shape would require either a giant union or duplicating
  // every per-command args type. The bin only ever calls these as
  // opaque commands, so we widen here.
  return `// GENERATED — do not edit. Run \`nx run cli:gen-commands\` to refresh.
import type { CommandDef } from 'citty';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GENERATED_COMMANDS: Record<string, () => Promise<CommandDef<any>>> = {
${entries}
};
`;
}

function runtimeHelpersSource(): string {
  return `// GENERATED — do not edit. Hand-rolled by \`scripts/gen-commands/main.ts\`
// because generated handlers must share these helpers without depending
// on any hand-written sibling module under \`daemon/handlers/\`.
import type { Node } from '@mutates/core';

import { ErrorCode } from '../../../proto/error-codes';
import { RpcError } from '../../../proto/jsonrpc';
import type { Session } from '../../../session/session';
import {
  getAccessors,
  getAllDecorators,
  getClassAccessors,
  getClassMethods,
  getClassProperties,
  getClasses,
  getConstructors,
  getDecorators,
  getEnums,
  getExports,
  getFunctions,
  getImports,
  getInterfaces,
  getMethods,
  getNamedImports,
  getParams,
  getSourceFile,
  getSourceFiles,
  getVariables,
  matchQuery,
} from '@mutates/core';

/**
 * Top-level finders accept \`{ pattern }\` directly because the result
 * lives in the source file (classes, functions, etc.). Categories that
 * live *inside* another declaration (methods inside classes, params
 * inside functions, ...) need a two-step descent — see
 * \`COMPOSITE_RESOLVERS\` below.
 */
const FINDERS: Record<string, ((q?: Record<string, unknown>) => Node[]) | undefined> = {
  'all-decorators': getAllDecorators as never,
  classes: getClasses as never,
  enums: getEnums as never,
  exports: getExports as never,
  functions: getFunctions as never,
  imports: getImports as never,
  interfaces: getInterfaces as never,
  'source-file': getSourceFile as never,
  'source-files': getSourceFiles as never,
  variables: getVariables as never,
};

/**
 * Categories that need an enclosing scope before they can be enumerated.
 * Each resolver receives the file glob plus the optional filter and
 * returns the matched declarations. Without this, calling e.g.
 * \`getMethods({ pattern })\` blows up because \`getMethods\` expects
 * already-located class declarations, not a glob.
 */
const COMPOSITE_RESOLVERS: Record<string, (pattern: string) => Node[]> = {
  methods: (pattern) => getMethods(getClasses({ pattern }) as never),
  accessors: (pattern) => getAccessors(getClasses({ pattern }) as never),
  'class-accessors': (pattern) => getClassAccessors(getClasses({ pattern })),
  'class-methods': (pattern) => getClassMethods(getClasses({ pattern })),
  'class-properties': (pattern) => getClassProperties(getClasses({ pattern })),
  constructors: (pattern) => getConstructors(getClasses({ pattern })),
  decorators: (pattern) => getDecorators(getClasses({ pattern })),
  params: (pattern) => getParams(getFunctions({ pattern })),
  'named-imports': (pattern) => getNamedImports(getImports({ pattern })),
};

/**
 * Resolve the target nodes for a generated handler. Either a single
 * \`--ref\` (preferred) or a \`--file\` glob plus an optional \`--filter\`
 * structure-match query.
 */
export function resolveDeclarations(
  session: Session,
  category: string,
  target: { ref?: string; file?: string; filter?: Record<string, unknown> } | undefined,
): Node[] {
  if (target?.ref) {
    const { node } = session.refs.resolve(target.ref);
    return [node];
  }
  if (target?.file) {
    const nodes = resolveByPattern(category, target.file);
    if (nodes === null) {
      throw new RpcError(
        ErrorCode.InvalidInput,
        \`no finder registered for category "\${category}" — pass --ref instead\`,
        { category },
      );
    }
    if (!target.filter) return nodes;
    return nodes.filter((n) =>
      matchQuery(
        (n as unknown as { getStructure(): Record<string, unknown> }).getStructure(),
        target.filter as never,
      ),
    );
  }
  throw new RpcError(
    ErrorCode.InvalidInput,
    'target requires either ref or file (with optional filter)',
  );
}

function resolveByPattern(category: string, pattern: string): Node[] | null {
  const composite = COMPOSITE_RESOLVERS[category];
  if (composite) return composite(pattern);
  const finder = FINDERS[category];
  if (!finder) return null;
  return finder({ pattern });
}


/**
 * Mint refs for every node returned by a \`get*\` op.
 *
 * The helper tolerates \`null\` / single-node returns (e.g. \`getSourceFile\`)
 * so the generated handlers don't have to special-case shape.
 */
export function mintNodeRefs(
  session: Session,
  result: unknown,
): Array<{ ref: string; file: string; name?: string }> {
  if (result === null || result === undefined) return [];
  const list = Array.isArray(result) ? result : [result];
  return list
    .filter((node): node is Node => Boolean(node))
    .map((node) => {
      const file = node.getSourceFile().getFilePath();
      const ref = session.refs.mint(node, file);
      const name = readName(node);
      return name === undefined ? { ref, file } : { ref, file, name };
    });
}

function readName(node: Node): string | undefined {
  const candidate = (node as unknown as { getName?: () => string | undefined }).getName;
  if (typeof candidate === 'function') {
    try {
      const n = candidate.call(node);
      if (typeof n === 'string' && n.length > 0) return n;
    } catch {
      // ignore
    }
  }
  return undefined;
}
`;
}

// CLI entry — invoked by Nx target.
if (require.main === module) {
  const args = process.argv.slice(2);
  let outRoot: string | undefined;
  let check = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') outRoot = args[++i];
    else if (args[i] === '--check') check = true;
  }
  if (check) {
    const result = runCheck();
    process.exit(result.ok ? 0 : 1);
  }
  const { count } = run({ outRoot });
  console.log(`[gen-commands] generated ${count} ops`);
}

/**
 * `--check` mode: re-run the generator into a tmp dir and diff the
 * resulting `.manifest.json` against the committed one. The .ts files
 * themselves are not diffed because they're gitignored — but every
 * op should land in the manifest under the same name, so any silent
 * regression in the classifier is caught here.
 */
function runCheck(): { ok: boolean } {
  const tmp = join(REPO_ROOT, 'tmp', 'gen-commands-check');
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const result = run({ outRoot: tmp });
  const expectedPath = join(CLI_ROOT, 'src/generated/.manifest.json');
  const actualPath = join(tmp, 'src/generated/.manifest.json');
  if (!existsSync(expectedPath)) {
    console.error(`[gen-commands:check] missing committed manifest at ${expectedPath}`);
    return { ok: false };
  }
  const expected = readFileSync(expectedPath, 'utf8');
  const actual = readFileSync(actualPath, 'utf8');
  if (expected !== actual) {
    console.error(
      '[gen-commands:check] manifest drifted — run `nx run cli:gen-commands` and commit the result.',
    );
    return { ok: false };
  }
  console.log(`[gen-commands:check] manifest stable (${result.count} ops)`);
  return { ok: true };
}
