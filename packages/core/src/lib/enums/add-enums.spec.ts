import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addEnums } from './add-enums';

describe('addEnums', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
console.log('Some log');
`,
    );
  });

  it('should add enums', () => {
    addEnums('some/path/file.ts', [
      {
        name: 'Enum',
        isConst: true,
        members: [{ name: 'First' }, { name: 'second' }],
      },
      {
        name: 'EmptyEnum',
        isExported: true,
      },
    ]);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
console.log('Some log');
const enum Enum {
    First,
    second
}

export enum EmptyEnum {
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
