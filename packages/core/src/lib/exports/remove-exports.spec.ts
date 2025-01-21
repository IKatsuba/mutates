import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getExports } from './get-exports';
import { removeExports } from './remove-exports';

describe('removeExports', () => {
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

  it('should remove exports', () => {
    const exports = getExports({ pattern: 'some/path/file.ts' });

    removeExports(exports);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
console.log(a);
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
