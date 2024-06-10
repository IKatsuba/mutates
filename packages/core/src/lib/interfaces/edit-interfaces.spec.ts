import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editInterfaces } from './edit-interfaces';
import { getInterfaces } from './get-interfaces';

describe('editInterfaces', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
interface A {}

const a: A;
`,
    );
  });

  it('should edit Interfaces', () => {
    const declarations = getInterfaces('some/path/file.ts');

    editInterfaces(declarations, () => ({
      name: 'B',
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
interface B {}

const a: B;
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
