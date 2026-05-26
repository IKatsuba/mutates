import type { Project, Signature, Type } from 'ts-morph';
import { Node } from 'ts-morph';

export type Verb = 'add' | 'edit' | 'remove' | 'get';

/**
 * How a core function takes its target(s). Drives the citty `args` shape
 * and the daemon-handler dispatch.
 *
 * - `pattern`     — first param is a glob `Pattern` (e.g. `addClasses`).
 * - `nodes`       — first param is a Node or Node[] (e.g. `addMethods`).
 * - `query`       — single optional `Query` param (e.g. `getClasses`).
 * - `declarations-editor` — first is Node[]; second is an editor callback
 *                  (e.g. `editClasses`) — the CLI passes JSON as a
 *                  `Partial<Structure>` and the handler wraps it as the
 *                  editor.
 * - `no-params`   — function takes no params; we emit a no-data command.
 */
export type TargetShape = 'pattern' | 'nodes' | 'query' | 'declarations-editor' | 'no-params';

export interface Classified {
  /** The verb prefix of the core export. */
  verb: Verb;
  /** Kebab-cased category derived from the core name minus the verb. */
  category: string;
  /** The original camelCase export name from `@mutates/core`. */
  coreName: string;
  /** Argument shape rule. */
  targetShape: TargetShape;
  /**
   * For mutator functions, the structure-ish type of the second
   * parameter (e.g. `ClassDeclarationStructure`). Captured as text so
   * downstream emitters can mention it in descriptions.
   */
  dataTypeText?: string;
  /** Original signature text for documentation/debug. */
  signatureText: string;
}

const VERB_RE = /^(add|edit|remove|get)([A-Z][a-zA-Z0-9]*)$/;

/**
 * Walk the named exports of `packages/core/src/index.ts` and produce a
 * normalized `Classified` record for every function whose name matches
 * the `(add|edit|remove|get)<Category>` pattern.
 *
 * Re-exported `ts-morph` names and helper utilities are filtered out so
 * the emitter never tries to bind a command to e.g. `getDeclarationCreator`.
 */
export function classify(coreProject: Project): Classified[] {
  const idx = coreProject.getSourceFileOrThrow('packages/core/src/index.ts');
  const namedToSymbol = new Map<string, ReturnType<typeof idx.getExportSymbols>[number]>();
  for (const sym of idx.getExportSymbols()) {
    namedToSymbol.set(sym.getName(), sym);
  }

  const out: Classified[] = [];
  for (const [name, sym] of namedToSymbol) {
    const match = VERB_RE.exec(name);
    if (!match) continue;
    // Skip generic helper factories (`getDeclarationGetter`, …): their
    // category resolves to e.g. `declaration-getter`, which is not a real
    // operation. We detect them by the fact that they *return* a function
    // rather than being one we can invoke directly.
    if (isHelperFactory(name)) continue;

    const verb = match[1] as Verb;
    const rawCategory = match[2];

    const decl = sym.getDeclarations()[0];
    if (!decl) continue;
    const signature = readCallableSignature(decl);
    if (!signature) continue;

    const targetShape = classifyShape(verb, signature);
    const dataTypeText = readDataTypeText(signature);

    out.push({
      verb,
      category: toKebab(rawCategory),
      coreName: name,
      targetShape,
      dataTypeText,
      signatureText: signature.getDeclaration().getText().slice(0, 400),
    });
  }
  // Stable order: verb then category then coreName.
  out.sort((a, b) =>
    a.verb !== b.verb
      ? a.verb.localeCompare(b.verb)
      : a.category !== b.category
        ? a.category.localeCompare(b.category)
        : a.coreName.localeCompare(b.coreName),
  );
  return out;
}

/**
 * Convert a CamelCase segment to kebab-case (`MethodSignatures` →
 * `method-signatures`).
 */
export function toKebab(camel: string): string {
  return camel
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function isHelperFactory(name: string): boolean {
  // The `getDeclarationCreator` / `getDeclarationEditor` family — we
  // bind to the *result* of these (e.g. `addClasses`), not the factory.
  if (/^getDeclaration(Creator|Editor|Getter|Remover)$/.test(name)) return true;
  // Project / utility surface that doesn't fit the "op" mold.
  if (name === 'getActiveProject') return true;
  if (name === 'getCompilerOptionsFromTsConfig') return true;
  if (name === 'removeFromArray') return true;
  if (name === 'removeDeclarations') return true;
  return false;
}

function readCallableSignature(decl: Node): Signature | null {
  // `export function foo(...) ...`
  if (Node.isFunctionDeclaration(decl)) {
    const sigs = decl.getType().getCallSignatures();
    return sigs[0] ?? null;
  }
  // `export const foo = ...`
  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    if (!init) return null;
    const sigs = init.getType().getCallSignatures();
    return sigs[0] ?? null;
  }
  // `export const foo: SomeType = ...` may appear via type-only re-exports;
  // fall through.
  return null;
}

function classifyShape(verb: Verb, sig: Signature): TargetShape {
  const params = sig.getParameters();
  if (params.length === 0) return 'no-params';

  const decl = sig.getDeclaration();
  const declParams = decl.getParameters();
  const firstType = declParams[0]?.getType();
  if (!firstType) return 'no-params';

  if (verb === 'get') {
    // `get*` family: either pattern, query or nodes.
    if (isPatternType(firstType)) return 'pattern';
    if (isNodeOrNodeArray(firstType)) return 'nodes';
    return 'query';
  }

  if (verb === 'edit') {
    // `edit*` takes (declarations, editor); declarations-editor is the
    // canonical shape regardless of declaration ergonomics.
    return 'declarations-editor';
  }

  // add / remove
  if (isPatternType(firstType)) return 'pattern';
  return 'nodes';
}

function readDataTypeText(sig: Signature): string | undefined {
  const decl = sig.getDeclaration();
  const params = decl.getParameters();
  if (params.length < 2) return undefined;
  return params[1].getType().getText(decl).slice(0, 300);
}

function isPatternType(t: Type): boolean {
  // `Pattern` resolves to `string | readonly string[]`. Pure-pattern
  // params are entirely string-y; object-shaped queries that *contain* a
  // `pattern?` field are not pattern-typed.
  if (t.isString() || t.isStringLiteral()) return true;
  if (t.isUnion()) {
    return t.getUnionTypes().every((u) => {
      if (u.isString() || u.isStringLiteral() || u.isUndefined()) return true;
      // `readonly string[]`
      if (u.isArray()) {
        const el = u.getArrayElementTypeOrThrow();
        return el.isString() || el.isStringLiteral();
      }
      return false;
    });
  }
  if (t.isArray()) {
    const el = t.getArrayElementTypeOrThrow();
    return el.isString() || el.isStringLiteral();
  }
  return false;
}

function isNodeOrNodeArray(t: Type): boolean {
  if (t.isArray()) return isNodeOrNodeArray(t.getArrayElementTypeOrThrow());
  if (t.isUnion()) return t.getUnionTypes().some((u) => isNodeOrNodeArray(u));
  const text = t.getText();
  // ts-morph node types end in `Declaration`/`Expression`/`Specifier`/`Node`.
  return (
    /Declaration\b/.test(text) ||
    /Expression\b/.test(text) ||
    /Specifier\b/.test(text) ||
    text.endsWith('Node') ||
    /\bDecorator\b/.test(text) ||
    /\bSourceFile\b/.test(text)
  );
}
