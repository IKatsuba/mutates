import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editProperties } from './edit-properties';
import { getProperties } from './get-properties';

describe('editProperties', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  b = 0;
}
`,
    );
  });

  it('should edit properties', () => {
    const declarations = getProperties(getClasses('some/path/file.ts'));

    editProperties(declarations, () => ({
      name: 'b',
      initializer: "'s'",
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class A {
  b = 's';
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
