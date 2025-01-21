import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addClassProperties } from './add-class-properties';

describe('addClassProperties', () => {
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

  it('should add properties', () => {
    addClassProperties(getClasses({ name: 'B', pattern: 'some/path/file.ts' }), {
      name: 'test',
      initializer: '3',
    });

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class A {}
class B {
    test = 3;
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
