import { ObjectLiteralExpression } from 'ts-morph';

import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getVariables } from '../variables';
import { editObjectProperties } from './edit-object-properties';
import { getObjectProperties } from './get-object-properties';

describe('editObjectProperties', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
const a = {
  b: 0;
}
`,
    );
  });

  it('should edit properties', () => {
    const declarations = getObjectProperties(
      getVariables({ pattern: 'some/path/file.ts' })
        .at(0)
        ?.getDeclarations()
        .at(0)
        ?.getInitializer() as ObjectLiteralExpression,
    );

    editObjectProperties(declarations, ({ initializer }) => {
      console.log(initializer);
      return {
        initializer: "'s'",
      };
    });

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
const a = {
  b: 's';
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
