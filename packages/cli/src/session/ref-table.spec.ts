import { InMemoryFileSystemHost, Project } from '@mutates/core';

import { ErrorCode } from '../proto/error-codes';
import { RpcError } from '../proto/jsonrpc';
import { RefTable } from './ref-table';

function makeProject(): Project {
  return new Project({ fileSystem: new InMemoryFileSystemHost() });
}

describe('RefTable', () => {
  it('mints sequential ids per file starting at @n1', () => {
    const project = makeProject();
    const file = project.createSourceFile('/src/a.ts', `class A {}\nclass B {}\n`);
    const refs = new RefTable();
    const classes = file.getClasses();
    const r1 = refs.mint(classes[0], '/src/a.ts');
    const r2 = refs.mint(classes[1], '/src/a.ts');
    expect(r1).toBe('@n1');
    expect(r2).toBe('@n2');
  });

  it('resolves a freshly minted ref to its Node', () => {
    const project = makeProject();
    const file = project.createSourceFile('/src/a.ts', `class A {}\n`);
    const refs = new RefTable();
    const cls = file.getClasses()[0];
    const ref = refs.mint(cls, '/src/a.ts');
    const { node, file: f } = refs.resolve(ref);
    expect(node).toBe(cls);
    expect(f).toBe('/src/a.ts');
  });

  it('throws StaleRef when invalidateFile is called on the ref file', () => {
    const project = makeProject();
    const file = project.createSourceFile('/src/a.ts', `class A {}\n`);
    const refs = new RefTable();
    const ref = refs.mint(file.getClasses()[0], '/src/a.ts');
    refs.invalidateFile('/src/a.ts');
    try {
      refs.resolve(ref);
      throw new Error('expected StaleRef');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcError);
      expect((err as RpcError).code).toBe(ErrorCode.StaleRef);
    }
  });

  it('resets the id counter to @n1 after resetFile', () => {
    const project = makeProject();
    const file = project.createSourceFile('/src/a.ts', `class A {}\nclass B {}\n`);
    const refs = new RefTable();
    refs.mint(file.getClasses()[0], '/src/a.ts');
    refs.mint(file.getClasses()[1], '/src/a.ts');
    refs.resetFile('/src/a.ts');
    const ref = refs.mint(file.getClasses()[0], '/src/a.ts');
    expect(ref).toBe('@n1');
  });

  it('throws StaleRef when node.wasForgotten() is true', () => {
    const project = makeProject();
    const file = project.createSourceFile('/src/a.ts', `class A {}\n`);
    const refs = new RefTable();
    const cls = file.getClasses()[0];
    const ref = refs.mint(cls, '/src/a.ts');
    cls.forget();
    try {
      refs.resolve(ref);
      throw new Error('expected StaleRef');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcError);
      expect((err as RpcError).code).toBe(ErrorCode.StaleRef);
    }
  });

  it('throws StaleRef for an unknown ref', () => {
    const refs = new RefTable();
    try {
      refs.resolve('@n99');
      throw new Error('expected StaleRef');
    } catch (err) {
      expect(err).toBeInstanceOf(RpcError);
      expect((err as RpcError).code).toBe(ErrorCode.StaleRef);
    }
  });
});
