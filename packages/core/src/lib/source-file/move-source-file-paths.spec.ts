import { globSync, readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createTestingProject } from '../testing';
import { createSourceFile, getSourceFiles } from './index';
import { moveSourceFilePaths } from './move-source-file-paths';

// function camel case to dash case
function dasherize(filePath: string) {
  return filePath.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

describe('renameSourceFilePaths', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('testFile.ts', "import {a} from './some/testFile'");
    createSourceFile('some/testFile.ts', "export const a = 'b'");
    createSourceFile('some/DeepPath/testFile.ts', '');
    saveProject();

    moveSourceFilePaths(getSourceFiles('some/**/*.ts'), dasherize);
    saveProject();
  });

  it('should change a file content', () => {
    expect(readFileSync('testFile.ts')).toBe("import {a} from './some/test-file'");
  });

  it('should exist renamed files', () => {
    expect(globSync(['**/*.ts'])).toEqual([
      '/testFile.ts',
      '/some/test-file.ts',
      '/some/deep-path/test-file.ts',
    ]);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
