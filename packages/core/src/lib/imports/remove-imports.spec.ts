import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getImports } from './get-imports';
import { removeImports } from './remove-imports';

describe('removeImports', () => {
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

  it('should remove imports', () => {
    const imports = getImports({ pattern: 'some/path/file.ts' });

    removeImports(imports);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
console.log(a);
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
