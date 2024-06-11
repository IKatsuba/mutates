import { ObjectLiteralExpression } from 'ts-morph';

import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getVariables } from '../variables';
import { getObjectProperties } from './get-object-properties';
import { removeObjectProperties } from './remove-object-properties';

describe('removeObjectMethods', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
const b = {
  test: 'test'
}
`,
    );
  });

  it('should remove methods', () => {
    const declarations = getObjectProperties(
      getVariables('some/path/file.ts')
        .at(0)
        ?.getDeclarations()
        .at(0)
        ?.getInitializer() as ObjectLiteralExpression,
    );

    removeObjectProperties(declarations);

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
const b = {
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
