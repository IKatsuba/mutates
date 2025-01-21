import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getFunctions } from './get-functions';
import { removeFunctions } from './remove-functions';

describe('removeFunctions', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
function a(){
  return 'a'
}

export function b() {
    return 'b'
}
`,
    );
  });

  it('should remove the `b` function', () => {
    removeFunctions(getFunctions({ name: 'b' }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
function a(){
  return 'a'
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
