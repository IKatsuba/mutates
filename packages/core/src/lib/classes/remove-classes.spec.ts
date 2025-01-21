import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getClasses } from './get-classes';
import { removeClasses } from './remove-classes';

describe('removeClasses', () => {
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

  it('should remove classes', () => {
    removeClasses(getClasses({ name: 'A' }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
const a: A;
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
