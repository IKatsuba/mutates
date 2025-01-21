import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editFunctions } from './edit-functions';
import { getFunctions } from './get-functions';

describe('editFunctions', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
function a(){
  return 'a'
}
`,
    );
  });

  it('should rename a function', () => {
    const functions = getFunctions('some/**/**.ts');

    editFunctions(functions, () => ({
      isExported: true,
      name: 'b',
      statements: "return 'b'",
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
export function b(){
    return 'b'
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
