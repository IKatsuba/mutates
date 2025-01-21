import { Scope } from 'ts-morph';

import { getClasses } from '../classes';
import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getConstructors } from './get-constructors';

describe('getConstructors', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  constructor(a: string | number){

  }
}
    `,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
class B {
  protected constructor(a: string | number){

  }
}
    `,
    );
  });

  it('should find two constructors', () => {
    const declarations = getConstructors(getClasses());

    expect(declarations.length).toBe(2);
  });

  it('should find one constructor', () => {
    const declarations = getConstructors(getClasses({ pattern: 'some/path/file.ts' }));

    expect(declarations.length).toBe(1);
  });

  it('should find one constructor by name', () => {
    const declarations = getConstructors(getClasses(), {
      scope: Scope.Protected,
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
