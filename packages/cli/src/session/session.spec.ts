import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getActiveProject, resetActiveProject } from '@mutates/core';

import { Session } from './session';

describe('Session', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mutates-session-'));
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src/a.ts'), `export class A {}\n`);
  });

  afterEach(() => {
    resetActiveProject();
    rmSync(root, { recursive: true, force: true });
  });

  it('loads source files when no tsconfig is present', () => {
    const session = new Session({ root });
    const files = session.project.getSourceFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(session.tsconfig).toBeNull();
  });

  it('dirtyFiles is empty for a freshly loaded session', () => {
    const session = new Session({ root });
    expect(session.dirtyFiles()).toEqual([]);
  });

  it('dirtyFiles reports a file whose in-memory text was mutated', () => {
    const session = new Session({ root });
    const file = session.project.getSourceFiles()[0];
    file.addClass({ name: 'Foo' });
    const dirty = session.dirtyFiles();
    expect(dirty).toContain(file.getFilePath());
  });

  it('withActiveProject installs and restores the active project', () => {
    const session = new Session({ root });
    expect(() => getActiveProject()).toThrow();
    const result = session.withActiveProject(() => getActiveProject());
    expect(result).toBe(session.project);
    expect(() => getActiveProject()).toThrow();
  });

  it('withActiveProject nests and restores the previous active project', () => {
    const outer = new Session({ root });
    const inner = new Session({ root });
    outer.withActiveProject(() => {
      expect(getActiveProject()).toBe(outer.project);
      inner.withActiveProject(() => {
        expect(getActiveProject()).toBe(inner.project);
      });
      expect(getActiveProject()).toBe(outer.project);
    });
  });
});
