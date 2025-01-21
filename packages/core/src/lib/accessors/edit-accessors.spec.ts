import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editAccessors } from './edit-accessors';
import { getAccessors } from './get-accessors';

describe('editAccessors', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  set setter(value){

  }
}
    `,
    );
  });

  it('should edit accessors', () => {
    const declarations = getAccessors(getClasses({ pattern: 'some/path/file.ts' }));

    editAccessors(declarations, () => ({
      name: 'anotherName',
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class A {
  set anotherName(value){

  }
}
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
