import { resetActiveProject } from '../project';
import { createTestingProject } from '../testing';
import { createSourceFile, getSourceFiles } from './index';

describe('getSourceFiles', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('test.ts', '');
    createSourceFile('some/test.ts', '');
    createSourceFile('some/path/test.ts', '');
  });

  it('should find all source files', () => {
    const sourceFiles = getSourceFiles('some/**/*.ts');

    expect(sourceFiles.length).toBe(2);
  });

  it('should find three source files', () => {
    const sourceFiles = getSourceFiles('**/*.ts');

    expect(sourceFiles.length).toBe(3);
  });

  it('should find one source file', () => {
    const sourceFiles = getSourceFiles('some/test.ts');

    expect(sourceFiles.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
