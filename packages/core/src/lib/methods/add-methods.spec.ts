import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addMethods } from './add-methods';

describe('addMethods', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {}
class B {}
`,
    );
  });

  it('should add methods', () => {
    addMethods(getClasses({ name: 'B', pattern: 'some/path/file.ts' }), {
      name: 'test',
      statements: 'return 0;',
      returnType: 'number',
    });

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class A {}
class B {
    test(): number {
        return 0;
    }
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
