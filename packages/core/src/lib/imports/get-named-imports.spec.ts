import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getImports } from './get-imports';
import { getNamedImports } from './get-named-imports';

describe('getNamedImports', () => {
  beforeEach(() => {
    createTestingProject();
  });

  it('should find one named import', () => {
    createSourceFile(
      'some/path/one-more-file.ts',
      `
import { a } from 'd';
`,
    );

    const imports = getNamedImports(getImports('some/path/**.ts'), {
      name: 'a',
    });

    expect(imports.length).toBe(1);
  });
});
