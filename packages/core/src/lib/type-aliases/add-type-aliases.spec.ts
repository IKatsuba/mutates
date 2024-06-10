import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addTypeAliases } from './index';

describe('addTypeAliases', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', '');
  });

  it('should add type aliases', () => {
    addTypeAliases('some/path/file.ts', {
      name: 'A',
      typeParameters: ['T'],
      type: 'T[]',
    });

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`type A<T> = T[];
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
