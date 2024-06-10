import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addProperties } from './add-properties';

describe('addProperties', () => {
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
    addProperties(getClasses('some/path/file.ts', { name: 'B' }), {
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
