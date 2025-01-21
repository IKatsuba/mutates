import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editExports } from './edit-exports';
import { getExports } from './get-exports';

describe('editExports', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
export { a } from 'b';

console.log(a);
`,
    );
  });

  it('should edit exports', () => {
    const exports = getExports({ pattern: 'some/path/file.ts' });

    editExports(exports, () => ({
      namedExports: ['b,c'],
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
export { b,c } from 'b';

console.log(a);
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
