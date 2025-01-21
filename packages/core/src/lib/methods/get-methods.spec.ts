import { getClasses } from '../classes';
import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getMethods } from './get-methods';

describe('getMethods', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  b(){}
}
`,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
class B {
  static d(){}
}
`,
    );
  });

  it('should find two methods', () => {
    const declarations = getMethods(getClasses());

    expect(declarations.length).toBe(2);
  });

  it('should find one method', () => {
    const declarations = getMethods(getClasses({ pattern: 'some/path/file.ts' }));

    expect(declarations.length).toBe(1);
  });

  it('should find one method by name', () => {
    const declarations = getMethods(getClasses(), {
      name: 'd',
      isStatic: true,
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
