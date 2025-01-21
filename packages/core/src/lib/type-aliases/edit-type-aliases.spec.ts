import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editTypeAliases } from './edit-type-aliases';
import { getTypeAliases } from './get-type-aliases';

describe('editTypeAliases', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', 'type A = string[]; let a: A;');
  });

  it('should edit type aliases', () => {
    const declarations = getTypeAliases({ pattern: 'some/path/file.ts' });

    editTypeAliases(declarations, () => ({
      name: 'B',
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe('type B = string[]; let a: B;');
  });

  afterEach(() => {
    resetActiveProject();
  });
});
