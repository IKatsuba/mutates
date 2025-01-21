import { StructureKind } from 'ts-morph';

import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addAccessors } from './add-accessors';

describe('addAccessors', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {}
    `,
    );
  });

  it('should add accessors to the class', async () => {
    addAccessors(getClasses({ pattern: 'some/path/file.ts' }), [
      {
        name: 'setter',
        kind: StructureKind.SetAccessor,
      },
    ]);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class A {
    set setter() {
    }
}
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
