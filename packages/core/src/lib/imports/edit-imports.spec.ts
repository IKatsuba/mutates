import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editImports } from './edit-imports';
import { getImports } from './get-imports';

describe('editImports', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
import { a } from 'b';

console.log(a);
`,
    );
  });

  it('should edit imports', () => {
    const imports = getImports('some/path/file.ts');

    editImports(imports, () => ({
      namedImports: ['b,c'],
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
import { b,c } from 'b';

console.log(a);
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
