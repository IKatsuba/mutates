import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getInterfaces } from './get-interfaces';
import { removeInterfaces } from './remove-interfaces';

describe('removeInterfaces', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', 'interface A {}');
  });

  it('should remove Interfaces', () => {
    const declarations = getInterfaces('some/path/file.ts');

    removeInterfaces(declarations);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe('');
  });

  afterEach(() => {
    resetActiveProject();
  });
});
