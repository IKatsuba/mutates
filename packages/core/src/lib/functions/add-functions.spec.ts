import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addFunctions } from './add-functions';

describe('addFunctions', () => {
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

  it('should add a function', () => {
    addFunctions('some/**/**.ts', {
      isExported: true,
      name: 'b',
      statements: "return 'b'",
    });

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
function a(){
  return 'a'
}
export function b() {
    return 'b'
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
