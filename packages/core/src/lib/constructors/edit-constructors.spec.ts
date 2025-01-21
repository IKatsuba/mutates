import { Scope } from 'ts-morph';

import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editConstructors } from './edit-constructors';
import { getConstructors } from './get-constructors';

describe('editConstructors', () => {
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

  it('should edit constructors', () => {
    const declarations = getConstructors(getClasses({ pattern: 'some/path/file.ts' }));

    editConstructors(declarations, () => ({
      scope: Scope.Protected,
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class A {
  protected constructor(){

  }
}
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
