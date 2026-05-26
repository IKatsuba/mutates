import {
  Node,
  SyntaxKind,
  type ClassDeclaration,
  type FunctionDeclaration,
  type InterfaceDeclaration,
  type SourceFile,
} from '@mutates/core';

import { ErrorCode } from '../proto/error-codes';
import { RpcError } from '../proto/jsonrpc';
import type { Session } from './session';

/** A single entry in a {@link SnapshotResult}. */
export interface SnapshotEntry {
  ref: string;
  /** Short lowercase kind (`"class"`, `"function"`, ...) — see {@link KIND_BY_SYNTAX}. */
  kind: string;
  name?: string;
  modifiers?: string[];
  /** Count of children available via drill, when applicable. */
  children?: number;
}

export interface SnapshotResult {
  file: string;
  entries: SnapshotEntry[];
}

/**
 * Map ts-morph `SyntaxKind` numeric values to the short lowercase kind
 * label exposed in `SnapshotEntry.kind`. Anything not in this table
 * falls back to the long SyntaxKind name (`node.getKindName()`).
 */
const KIND_BY_SYNTAX: Partial<Record<SyntaxKind, string>> = {
  [SyntaxKind.ImportDeclaration]: 'import',
  [SyntaxKind.ClassDeclaration]: 'class',
  [SyntaxKind.FunctionDeclaration]: 'function',
  [SyntaxKind.VariableStatement]: 'variable',
  [SyntaxKind.InterfaceDeclaration]: 'interface',
  [SyntaxKind.EnumDeclaration]: 'enum',
  [SyntaxKind.TypeAliasDeclaration]: 'type',
  [SyntaxKind.ExportDeclaration]: 'export',
  [SyntaxKind.ExportAssignment]: 'export',
  [SyntaxKind.MethodDeclaration]: 'method',
  [SyntaxKind.PropertyDeclaration]: 'property',
  [SyntaxKind.GetAccessor]: 'getter',
  [SyntaxKind.SetAccessor]: 'setter',
  [SyntaxKind.Constructor]: 'constructor',
  [SyntaxKind.PropertySignature]: 'property',
  [SyntaxKind.MethodSignature]: 'method',
  [SyntaxKind.IndexSignature]: 'index',
  [SyntaxKind.CallSignature]: 'call',
  [SyntaxKind.ConstructSignature]: 'construct',
};

/**
 * Render the top-level structure of `file`. Resets the file's ref id
 * counter so the first declaration is always `@n1`.
 */
export function snapshotFile(session: Session, file: string): SnapshotResult {
  const sourceFile = session.project.getSourceFile(file);
  if (!sourceFile) {
    throw new RpcError(ErrorCode.NotFound, `file not found in session: ${file}`, { file });
  }
  const absFile = sourceFile.getFilePath();
  session.refs.resetFile(absFile);

  const entries: SnapshotEntry[] = [];
  for (const node of collectTopLevel(sourceFile)) {
    entries.push(buildEntry(session, node, absFile));
  }
  return { file: absFile, entries };
}

/**
 * Drill into `parentRef`'s children. Members of classes/interfaces and
 * statements of functions are surfaced as fresh entries (sharing the
 * parent's file generation — drill does NOT reset the file).
 */
export function snapshotChildren(session: Session, parentRef: string): SnapshotResult {
  const { node, file } = session.refs.resolve(parentRef);
  const entries: SnapshotEntry[] = [];
  for (const child of collectChildren(node)) {
    entries.push(buildEntry(session, child, file));
  }
  return { file, entries };
}

function collectTopLevel(sourceFile: SourceFile): Node[] {
  const wanted = new Set<SyntaxKind>([
    SyntaxKind.ImportDeclaration,
    SyntaxKind.ClassDeclaration,
    SyntaxKind.FunctionDeclaration,
    SyntaxKind.VariableStatement,
    SyntaxKind.InterfaceDeclaration,
    SyntaxKind.EnumDeclaration,
    SyntaxKind.TypeAliasDeclaration,
    SyntaxKind.ExportDeclaration,
    SyntaxKind.ExportAssignment,
  ]);
  return sourceFile.getStatements().filter((s) => wanted.has(s.getKind()));
}

function collectChildren(node: Node): Node[] {
  if (Node.isClassDeclaration(node)) {
    return (node as ClassDeclaration).getMembers();
  }
  if (Node.isInterfaceDeclaration(node)) {
    return (node as InterfaceDeclaration).getMembers();
  }
  if (Node.isFunctionDeclaration(node)) {
    const body = (node as FunctionDeclaration).getBody();
    if (body && Node.isBlock(body)) {
      return body.getStatements();
    }
    return [];
  }
  return [];
}

function buildEntry(session: Session, node: Node, file: string): SnapshotEntry {
  const ref = session.refs.mint(node, file);
  const kind = shortKind(node);
  const entry: SnapshotEntry = { ref, kind };

  const name = nameOf(node);
  if (name) entry.name = name;

  const modifiers = modifiersOf(node);
  if (modifiers.length > 0) entry.modifiers = modifiers;

  const children = childCount(node);
  if (children > 0) entry.children = children;

  return entry;
}

function shortKind(node: Node): string {
  return KIND_BY_SYNTAX[node.getKind()] ?? node.getKindName();
}

function nameOf(node: Node): string | undefined {
  // `getName` may not exist for every node type; guard at runtime.
  const candidate = (node as unknown as { getName?: () => string | undefined }).getName;
  if (typeof candidate === 'function') {
    try {
      const name = candidate.call(node);
      if (typeof name === 'string' && name.length > 0) return name;
    } catch {
      // Unnamed declaration — fall through.
    }
  }
  if (Node.isVariableStatement(node)) {
    const first = node.getDeclarations()[0];
    return first?.getName();
  }
  if (Node.isImportDeclaration(node)) {
    return node.getModuleSpecifierValue();
  }
  if (Node.isExportDeclaration(node)) {
    return node.getModuleSpecifierValue();
  }
  return undefined;
}

function modifiersOf(node: Node): string[] {
  const mods: string[] = [];
  const exportable = node as unknown as {
    isExported?: () => boolean;
    isDefaultExport?: () => boolean;
  };
  if (typeof exportable.isExported === 'function' && exportable.isExported()) {
    mods.push('exported');
  }
  if (typeof exportable.isDefaultExport === 'function' && exportable.isDefaultExport()) {
    mods.push('default');
  }
  const asyncable = node as unknown as { isAsync?: () => boolean };
  if (typeof asyncable.isAsync === 'function' && asyncable.isAsync()) {
    mods.push('async');
  }
  return mods;
}

function childCount(node: Node): number {
  if (Node.isClassDeclaration(node)) return node.getMembers().length;
  if (Node.isInterfaceDeclaration(node)) return node.getMembers().length;
  if (Node.isFunctionDeclaration(node)) {
    const body = node.getBody();
    if (body && Node.isBlock(body)) return body.getStatements().length;
  }
  return 0;
}
