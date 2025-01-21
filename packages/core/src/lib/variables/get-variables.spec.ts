import { VariableDeclarationKind } from 'ts-morph';

import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getVariables } from './get-variables';

describe('getVariables', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', 'const a;');

    createSourceFile('some/path/one-more-file.ts', 'var b = {};');
  });

  it('should find two variables', () => {
    const declarations = getVariables('some/path/**.ts');

    expect(declarations.length).toBe(2);
  });

  it('should find one variable', () => {
    const declarations = getVariables('some/path/file.ts');

    expect(declarations.length).toBe(1);
  });

  it('should find one variable by variable kind', () => {
    const declarations = getVariables('some/path/**.ts', {
      declarationKind: VariableDeclarationKind.Var,
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
