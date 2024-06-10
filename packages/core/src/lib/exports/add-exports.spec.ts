import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addExports } from './add-exports';

describe('addExports', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
console.log(a);
`,
    );
  });

  it('should add exports', () => {
    addExports('some/path/file.ts', [
      {
        namedExports: ['a'],
        moduleSpecifier: 'b',
      },
      {
        namespaceExport: 'c',
        moduleSpecifier: 'd',
      },
      {
        namedExports: ['e'],
        moduleSpecifier: 'f',
        isTypeOnly: true,
      },
    ]);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
console.log(a);
export { a } from "b";
export * as c from "d";
export type { e } from "f";
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
