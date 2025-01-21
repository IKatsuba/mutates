import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getClassProperties } from './get-class-properties';
import { removeClassProperties } from './remove-class-properties';

describe('removeMethods', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class B {
  test = 'test'
}

class A {
  prop = 1;
}
`,
    );
  });

  it('should remove methods', () => {
    const declarations = getClassProperties(getClasses('some/path/file.ts', { name: 'B' }), {
      name: 'test',
    });

    removeClassProperties(declarations);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class B {
}

class A {
  prop = 1;
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
