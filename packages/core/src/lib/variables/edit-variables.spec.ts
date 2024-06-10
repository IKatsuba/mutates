import { VariableDeclarationKind } from 'ts-morph';

import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editVariables } from './edit-variables';
import { getVariables } from './get-variables';

describe('editVariables', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', "const a = 's'");
  });

  it('should edit variables', () => {
    const declarations = getVariables('some/path/file.ts');

    editVariables(declarations, () => ({
      declarationKind: VariableDeclarationKind.Let,
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe("let a = 's'");
  });

  afterEach(() => {
    resetActiveProject();
  });
});
