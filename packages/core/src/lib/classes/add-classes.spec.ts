import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addClasses } from './add-classes';

describe('addClasses', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', '');
  });

  it('should add classes', () => {
    addClasses('some/path/file.ts', {
      name: 'A',
      isDefaultExport: true,
      methods: [
        {
          name: 'method',
          isStatic: true,
          statements: 'return 0',
          returnType: 'number',
        },
      ],
    });

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`export default class A {
    static method(): number {
        return 0
    }
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
