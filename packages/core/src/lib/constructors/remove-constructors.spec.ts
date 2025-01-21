import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getConstructors } from './get-constructors';
import { removeConstructors } from './remove-constructors';

describe('removeConstructors', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  constructor(){

  }
}
    `,
    );
  });

  it('should remove constructors', () => {
    const declarations = getConstructors(getClasses({ pattern: 'some/path/file.ts' }));

    removeConstructors(declarations);

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
