import { Scope } from 'ts-morph';

import { getClasses } from '../classes';
import { getConstructors } from '../constructors';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editParams } from './edit-params';
import { getParams } from './get-params';

describe('editParams', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class B {
  constructor(param1: number, param2: string){}
}
    `,
    );
  });

  it('should edit params', () => {
    const declarations = getParams(getConstructors(getClasses({ pattern: 'some/path/file.ts' })), {
      name: 'param2',
    });

    editParams(declarations, () => ({
      scope: Scope.Private,
      name: 'anotherParam',
      type: 'number',
      initializer: 'Math.PI',
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class B {
  constructor(param1: number, private anotherParam: number = Math.PI){}
}
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
