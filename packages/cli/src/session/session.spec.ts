import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getActiveProject, resetActiveProject } from '@mutates/core';

import { ErrorCode } from '../proto/error-codes';
import { RpcError } from '../proto/jsonrpc';
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

  it('loads files from an explicit leaf tsconfig', () => {
    const tsconfigPath = join(root, 'tsconfig.lib.json');
    writeFileSync(
      tsconfigPath,
      JSON.stringify({
        compilerOptions: { target: 'ES2022', module: 'commonjs' },
        include: ['src/**/*'],
      }),
    );
    const session = new Session({ root, tsconfig: tsconfigPath });
    expect(session.tsconfig).toBe(tsconfigPath);
    expect(session.project.getSourceFiles().length).toBeGreaterThan(0);
  });

  it('rejects a solution-style tsconfig with INVALID_INPUT', () => {
    // Solution-style: empty files/include, has references → ts-morph would
    // silently load 0 source files.
    const tsconfigPath = join(root, 'tsconfig.json');
    writeFileSync(
      tsconfigPath,
      // JSONC: leading comment + trailing comma to exercise the
      // ts.parseConfigFileTextToJson path.
      [
        '// solution-style tsconfig',
        '{',
        '  "files": [],',
        '  "references": [{ "path": "./packages/foo" }],',
        '}',
      ].join('\n'),
    );
    let err: unknown;
    try {
      // eslint-disable-next-line no-new
      new Session({ root });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(RpcError);
    expect((err as RpcError).code).toBe(ErrorCode.InvalidInput);
    expect((err as RpcError).message).toMatch(/solution-style/);
  });

  it('rejects a missing --tsconfig with INVALID_INPUT', () => {
    let err: unknown;
    try {
      // eslint-disable-next-line no-new
      new Session({ root, tsconfig: join(root, 'does-not-exist.json') });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(RpcError);
    expect((err as RpcError).code).toBe(ErrorCode.InvalidInput);
    expect((err as RpcError).message).toMatch(/tsconfig not found/);
  });

  it('fallback glob excludes node_modules and dist', () => {
    mkdirSync(join(root, 'node_modules/some-pkg'), { recursive: true });
    writeFileSync(join(root, 'node_modules/some-pkg/index.ts'), 'export const x = 1;\n');
    mkdirSync(join(root, 'dist'), { recursive: true });
    writeFileSync(join(root, 'dist/a.ts'), 'export const y = 1;\n');

    const session = new Session({ root });
    const paths = session.project.getSourceFiles().map((sf) => sf.getFilePath());
    expect(paths.some((p) => p.includes('/node_modules/'))).toBe(false);
    expect(paths.some((p) => p.includes('/dist/'))).toBe(false);
    expect(paths.some((p) => p.endsWith('src/a.ts'))).toBe(true);
  });
});
