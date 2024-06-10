import { VariableDeclarationKind } from 'ts-morph';

import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addVariables } from './add-variables';

describe('addVariables', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', '');
  });

  it('should add variables', () => {
    addVariables('some/path/file.ts', {
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: 'name',
          initializer: "'value'",
        },
      ],
    });

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`const name = 'value';
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
