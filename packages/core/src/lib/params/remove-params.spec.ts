import { getClasses } from '../classes';
import { getConstructors } from '../constructors';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getParams } from './get-params';
import { removeParams } from './remove-params';

describe('removeParams', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  constructor(value1, value2 = 'defaultValue', value3){}
}
    `,
    );
  });

  it('should remove params', () => {
    const declarations = getParams(getConstructors(getClasses('some/path/file.ts')), {
      initializer: "'defaultValue'",
    });

    removeParams(declarations);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class A {
  constructor(value1, value3){}
}
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
