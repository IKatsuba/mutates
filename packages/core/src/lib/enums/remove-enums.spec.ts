import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getEnums } from './get-enums';
import { removeEnums } from './remove-enums';

describe('removeEnums', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', 'enum Test { }');
  });

  it('should remove enums', () => {
    const declarations = getEnums({ name: 'Test', pattern: 'some/path/file.ts' });

    removeEnums(declarations);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe('');
  });

  afterEach(() => {
    resetActiveProject();
  });
});
