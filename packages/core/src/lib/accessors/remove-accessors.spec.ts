import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getAccessors } from './get-accessors';
import { removeAccessors } from './remove-accessors';

describe('removeAccessors', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  get getter(){}

  set setter(value){}
}
    `,
    );
  });

  it('should remove accessors', () => {
    const declarations = getAccessors(getClasses({ pattern: 'some/path/file.ts' }));

    removeAccessors(declarations);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class A {
}
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
