import { Scope } from 'ts-morph';

import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addConstructors } from './add-constructors';

describe('addConstructors', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class B {

}
    `,
    );
  });

  it('should add constructors', () => {
    addConstructors(getClasses('some/path/file.ts', { name: 'B' }), {
      parameters: [
        {
          decorators: [{ name: 'Inject', arguments: ['SomeType'] }],
          name: 'param',
          type: 'SomeType',
        },
      ],
      scope: Scope.Protected,
    });

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class B {
    protected constructor(@Inject(SomeType) param: SomeType) {
    }
}
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
