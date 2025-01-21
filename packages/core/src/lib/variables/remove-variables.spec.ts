import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getVariables } from './get-variables';
import { removeVariables } from './remove-variables';

describe('removeVariables', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', "const a = 'b'");
  });

  it('should remove variables', () => {
    const declarations = getVariables({ pattern: 'some/path/file.ts' });

    removeVariables(declarations);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe('');
  });

  afterEach(() => {
    resetActiveProject();
  });
});
