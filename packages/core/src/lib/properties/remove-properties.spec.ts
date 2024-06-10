import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getProperties } from './get-properties';
import { removeProperties } from './remove-properties';

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
    const declarations = getProperties(getClasses('some/path/file.ts', { name: 'B' }), {
      name: 'test',
    });

    removeProperties(declarations);

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
