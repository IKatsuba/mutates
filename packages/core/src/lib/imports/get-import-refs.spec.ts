import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getImportRefs } from './get-import-refs';
import { getImports } from './get-imports';
import { getNamedImports } from './get-named-imports';

describe('getImportRefs', () => {
  beforeEach(() => {
    createTestingProject();
  });

  it('should find one named import', () => {
    createSourceFile(
      'some/path/one-more-file.ts',
      `
import { a } from 'd';

a();
`,
    );

    const imports = getNamedImports(getImports('some/path/**.ts'), {
      name: 'a',
    });

    const refs = getImportRefs(imports);
    console.log(refs);
    expect(refs.length).toBe(1);
  });
});
