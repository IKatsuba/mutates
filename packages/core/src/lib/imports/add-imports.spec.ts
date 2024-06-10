import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addImports } from './add-imports';

describe('addImports', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
console.log(a);
`,
    );
  });

  it('should add imports', () => {
    addImports('some/path/file.ts', [
      {
        namedImports: ['a'],
        moduleSpecifier: 'b',
      },
      {
        namespaceImport: 'c',
        moduleSpecifier: 'd',
      },
      {
        defaultImport: 'c',
        moduleSpecifier: 'd',
      },
      {
        namedImports: ['e'],
        moduleSpecifier: 'f',
        isTypeOnly: true,
      },
    ]);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`import { a } from "b";
import * as c from "d";
import c from "d";
import type { e } from "f";

console.log(a);
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
