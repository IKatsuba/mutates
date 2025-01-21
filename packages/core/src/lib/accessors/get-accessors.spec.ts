import { getClasses } from '../classes';
import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getAccessors } from './get-accessors';

describe('getAccessors', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  get getter(){}
}
    `,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
class B {
  set setter(value){}
}
    `,
    );
  });

  it('should find two accessors', () => {
    const declarations = getAccessors(getClasses());

    expect(declarations.length).toBe(2);
  });

  it('should find one accessor', () => {
    const declarations = getAccessors(getClasses({ pattern: 'some/path/file.ts' }));

    expect(declarations.length).toBe(1);
  });

  it('should find one accessor by name', () => {
    const declarations = getAccessors(getClasses(), {
      name: 'setter',
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
