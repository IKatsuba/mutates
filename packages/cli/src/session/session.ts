import { randomUUID } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';

import { Project, resetActiveProject, setActiveProject, type SourceFile } from '@mutates/core';

import { FileStatCache } from './file-stat-cache';
import { RefTable } from './ref-table';

export interface SessionOptions {
  /** Absolute or relative project root. */
  root: string;
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

    const tsconfigCandidate = join(this.root, 'tsconfig.json');
    this.tsconfig = existsSync(tsconfigCandidate) ? tsconfigCandidate : null;

    this.project = this.tsconfig ? new Project({ tsConfigFilePath: this.tsconfig }) : new Project();

    if (!this.tsconfig) {
      // No tsconfig — lazily pick up any TS sources under root so a
      // bare-directory project still has source files to operate on.
      this.project.addSourceFilesAtPaths(join(this.root, '**/*.{ts,tsx}'));
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
