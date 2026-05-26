import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve as resolvePath } from 'node:path';

import { Project, resetActiveProject, setActiveProject, type SourceFile } from '@mutates/core';

import { ErrorCode } from '../proto/error-codes';
import { RpcError } from '../proto/jsonrpc';
import { FileStatCache } from './file-stat-cache';
import { RefTable } from './ref-table';

export interface SessionOptions {
  /** Absolute or relative project root. */
  root: string;
  /**
   * Optional path to a tsconfig (absolute or relative to `root`). When
   * provided, overrides the default lookup of `<root>/tsconfig.json`.
   * A solution-style tsconfig (empty `files`/`include` with non-empty
   * `references`) is rejected — pass a leaf tsconfig instead.
   */
  tsconfig?: string;
}

interface RecordedText {
  text: string;
}

/**
 * A live ts-morph project plus the bookkeeping required to mint refs,
 * detect external file changes, and bridge `@mutates/core`'s
 * singleton-style `getActiveProject()` API.
 *
 * The daemon process owns at most one Session at a time (one project
 * root per daemon — Req 10.1).
 */
export class Session {
  readonly id: string;
  readonly root: string;
  readonly openedAt: number;
  readonly tsconfig: string | null;
  readonly project: Project;
  readonly refs: RefTable;
  readonly stats: FileStatCache;

  /** Snapshot of each source file's text at load / save time. */
  private readonly textAtLoad = new Map<string, RecordedText>();

  constructor(opts: SessionOptions) {
    this.id = randomUUID();
    this.root = resolvePath(opts.root);
    this.openedAt = Date.now();

    if (opts.tsconfig !== undefined) {
      const resolved = isAbsolute(opts.tsconfig)
        ? opts.tsconfig
        : resolvePath(this.root, opts.tsconfig);
      if (!existsSync(resolved)) {
        throw new RpcError(ErrorCode.InvalidInput, `session: tsconfig not found: ${resolved}`, {
          tsconfig: resolved,
        });
      }
      this.tsconfig = resolved;
    } else {
      const candidate = join(this.root, 'tsconfig.json');
      this.tsconfig = existsSync(candidate) ? candidate : null;
    }

    this.project = this.tsconfig ? new Project({ tsConfigFilePath: this.tsconfig }) : new Project();

    if (this.tsconfig) {
      // ts-morph silently accepts solution-style tsconfigs (empty
      // files/include with references) and loads 0 source files. Detect
      // that explicitly and surface a useful error instead of a silently
      // empty session.
      if (this.project.getSourceFiles().length === 0 && isSolutionStyle(this.tsconfig)) {
        throw new RpcError(
          ErrorCode.InvalidInput,
          `session: tsconfig is solution-style (empty files/include, has references). Pass --tsconfig pointing at a leaf tsconfig (e.g. tsconfig.lib.json) or a --root with no tsconfig.json.`,
          { tsconfig: this.tsconfig },
        );
      }
    } else {
      // No tsconfig — lazily pick up any TS sources under root so a
      // bare-directory project still has source files to operate on.
      // Skip vendor/build/scratch directories so the session doesn't
      // balloon to thousands of irrelevant .d.ts files.
      this.project.addSourceFilesAtPaths([
        join(this.root, '**/*.{ts,tsx}'),
        `!${join(this.root, '**/node_modules/**')}`,
        `!${join(this.root, '**/dist/**')}`,
        `!${join(this.root, '**/.git/**')}`,
        `!${join(this.root, '**/tmp/**')}`,
        `!${join(this.root, '**/coverage/**')}`,
      ]);
    }

    this.refs = new RefTable();
    this.stats = new FileStatCache();

    for (const sf of this.project.getSourceFiles()) {
      this.recordLoaded(sf);
    }
  }

  /**
   * Record the initial fingerprint and text for a source file. Called
   * during construction and any time the session adopts a new file.
   */
  recordLoaded(sourceFile: SourceFile): void {
    const file = sourceFile.getFilePath();
    this.textAtLoad.set(file, { text: sourceFile.getFullText() });
    try {
      const s = statSync(file);
      this.stats.record(file, { mtimeMs: s.mtimeMs, size: s.size });
    } catch {
      // In-memory or otherwise unstattable file — skip the fingerprint;
      // verify will treat it as stale if save is attempted.
    }
  }

  /**
   * Re-baseline a source file after a successful save: capture the new
   * text + fingerprint so subsequent dirty checks compare against the
   * latest "clean" state.
   */
  rebaseline(sourceFile: SourceFile, fp: { mtimeMs: number; size: number }): void {
    const file = sourceFile.getFilePath();
    this.textAtLoad.set(file, { text: sourceFile.getFullText() });
    this.stats.record(file, fp);
  }

  /**
   * Bridge `@mutates/core`'s singleton: install this session's project
   * as the active one, run `fn`, restore the previous active project.
   */
  withActiveProject<T>(fn: () => T): T {
    const prev = setActiveProject(this.project);
    try {
      return fn();
    } finally {
      if (prev) setActiveProject(prev);
      else resetActiveProject();
    }
  }

  /**
   * Absolute paths of every source file whose in-memory text differs
   * from the text captured at load (or last save).
   */
  dirtyFiles(): string[] {
    const dirty: string[] = [];
    for (const sf of this.project.getSourceFiles()) {
      const file = sf.getFilePath();
      const recorded = this.textAtLoad.get(file);
      if (!recorded) {
        // Newly added file — treat as dirty so save will pick it up.
        dirty.push(file);
        continue;
      }
      if (sf.getFullText() !== recorded.text) dirty.push(file);
    }
    return dirty;
  }
}

/**
 * Heuristic: a tsconfig is "solution-style" when it declares no files
 * itself (both `files` and `include` absent or empty) but lists project
 * `references`. Such configs delegate compilation to referenced
 * sub-projects and load 0 source files in ts-morph's default mode.
 */
function isSolutionStyle(tsconfigPath: string): boolean {
  try {
    const raw = readFileSync(tsconfigPath, 'utf8');
    const stripped = stripJsonComments(raw);
    const cfg = JSON.parse(stripped) as {
      files?: unknown[];
      include?: unknown[];
      references?: unknown[];
    };
    const noFiles = !Array.isArray(cfg.files) || cfg.files.length === 0;
    const noInclude = !Array.isArray(cfg.include) || cfg.include.length === 0;
    const hasReferences = Array.isArray(cfg.references) && cfg.references.length > 0;
    return noFiles && noInclude && hasReferences;
  } catch {
    return false;
  }
}

/**
 * Minimal JSON-with-comments stripper for tsconfig files. Handles
 * `//` line comments and `/* … *\/` blocks. Not robust against
 * comments-inside-strings, but tsconfigs in practice don't contain
 * those.
 */
function stripJsonComments(input: string): string {
  return input.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
