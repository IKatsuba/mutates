import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editClasses } from './edit-classes';
import { getClasses } from './get-classes';

describe('editClasses', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {}

const a: A;
`,
    );
  });

  it('should edit classes', () => {
    const classes = getClasses('some/path/file.ts');

    editClasses(classes, () => ({
      isExported: true,
      name: 'B',
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
export class B {}

const a: B;
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
