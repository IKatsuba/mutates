import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getDecorators } from './get-decorators';
import { removeDecorators } from './remove-decorators';

describe('removeDecorators', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
@Decorator()
class A {}
    `,
    );
  });

  it('should remove decorators', () => {
    const declarations = getDecorators(getClasses('some/path/file.ts'));

    removeDecorators(declarations);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class A {}
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
