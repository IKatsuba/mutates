import { getClasses } from '../classes';
import { getConstructors } from '../constructors';
import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getParams } from './get-params';

describe('getParams', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  constructor(value){}
}
    `,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
class B {
  constructor(@Inject(SOME_TOKEN) name: number = Math.PI){}
}
    `,
    );
  });

  it('should find two params', () => {
    const declarations = getParams(getConstructors(getClasses('some/path/**.ts')));

    expect(declarations.length).toBe(2);
  });

  it('should find one param', () => {
    const declarations = getParams(getConstructors(getClasses('some/path/file.ts')));

    expect(declarations.length).toBe(1);
  });

  it('should find one param by name', () => {
    const declarations = getParams(getConstructors(getClasses('some/path/**.ts')), {
      initializer: 'Math.PI',
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
