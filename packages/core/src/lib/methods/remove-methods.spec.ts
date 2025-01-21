import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getMethods } from './get-methods';
import { removeMethods } from './remove-methods';

describe('removeMethods', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class B {
  test(){}
}

class A {
  test(){}
}
`,
    );
  });

  it('should remove methods', () => {
    const declarations = getMethods(getClasses({ name: 'A', pattern: 'some/path/file.ts' }), {
      name: 'test',
    });

    removeMethods(declarations);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class B {
  test(){}
}

class A {
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
