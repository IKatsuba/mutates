import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getTypeAliases } from './get-type-aliases';
import { removeTypeAliases } from './remove-type-aliases';

describe('removeTypeAliases', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', 'type A = string;');
  });

  it('should remove type aliases', () => {
    const declarations = getTypeAliases({ pattern: 'some/path/file.ts' });

    removeTypeAliases(declarations);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe('');
  });

  afterEach(() => {
    resetActiveProject();
  });
});
