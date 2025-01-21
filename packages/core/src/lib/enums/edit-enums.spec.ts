import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editEnums } from './edit-enums';
import { getEnums } from './get-enums';

describe('editEnums', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
enum Test {First}

let a: Test;
const b = Test.First;
`,
    );
  });

  it('should edit enums', () => {
    const declarations = getEnums('some/path/file.ts');

    editEnums(declarations, () => ({
      name: 'Name',
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
enum Name {
    First
}

let a: Name;
const b = Name.First;
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
