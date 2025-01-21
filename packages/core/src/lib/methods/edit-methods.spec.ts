import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editMethods } from './edit-methods';
import { getMethods } from './get-methods';

describe('editMethods', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  test(){}
}

A.prototype.test();
`,
    );
  });

  it('should edit methods', () => {
    const declarations = getMethods(getClasses({ pattern: 'some/path/file.ts' }));

    editMethods(declarations, ({ isAsync }) => ({
      name: 'b',
      isAsync: !isAsync,
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class A {
  async b(){}
}

A.prototype.b();
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
