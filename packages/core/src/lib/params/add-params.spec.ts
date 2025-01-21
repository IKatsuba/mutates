import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { getMethods } from '../methods';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addParams } from './add-params';

describe('addParams', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class B {
  add(){}
}
    `,
    );
  });

  it('should add params', () => {
    addParams(getMethods(getClasses({ pattern: 'some/path/file.ts' }), { name: 'add' }), [
      {
        name: 'param',
        type: 'number',
        decorators: [{ name: 'Pure', arguments: [] }],
      },
    ]);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
class B {
  add(@Pure() param: number){}
}
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
