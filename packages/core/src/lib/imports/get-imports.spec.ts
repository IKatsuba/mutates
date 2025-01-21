import { StructureKind } from 'ts-morph';

import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getImports } from './get-imports';

describe('getImports', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
import { a } from 'b';
`,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
import { c } from 'd';
import { a } from 'd';
import b from 'd';
`,
    );
  });

  it('should find two imports', () => {
    const imports = getImports();

    expect(imports.length).toBe(4);
  });

  it('should find one import', () => {
    const imports = getImports({ pattern: 'some/path/file.ts' });

    expect(imports.length).toBe(1);
  });

  it('should find one import by module name', () => {
    const imports = getImports({
      moduleSpecifier: 'd',
      namedImports: 'c',
    });

    expect(imports.map((i) => i.getStructure())).toEqual([
      {
        isTypeOnly: false,
        kind: StructureKind.ImportDeclaration,
        moduleSpecifier: 'd',
        namedImports: [
          {
            isTypeOnly: false,
            kind: StructureKind.ImportSpecifier,
            name: 'c',
          },
        ],
      },
    ]);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
