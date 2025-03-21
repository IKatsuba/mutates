import { Node } from 'ts-morph';

import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editClassProperties } from './edit-class-properties';
import { getClassProperties } from './get-class-properties';

describe('editClassProperties', () => {
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
    const declarations = getClassProperties(getClasses({ pattern: 'some/path/file.ts' }));

    editClassProperties(declarations, () => ({
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
