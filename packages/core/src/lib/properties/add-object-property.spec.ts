import { ObjectLiteralExpression } from 'ts-morph';

import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getVariables } from '../variables';
import { addObjectProperty } from './add-object-property';

describe('addObjectProperties', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
const a = {};
`,
    );
  });

  it('should add properties', () => {
    addObjectProperty(
      getVariables({ pattern: 'some/path/file.ts' })
        .at(0)
        ?.getDeclarations()
        .at(0)
        ?.getInitializer() as ObjectLiteralExpression,
      {
        name: 'test',
        initializer: '3',
      },
    );

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
const a = {
    test: 3
};
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
