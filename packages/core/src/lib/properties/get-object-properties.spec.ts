import { ObjectLiteralExpression } from 'ts-morph';

import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getVariables } from '../variables';
import { getObjectProperties } from './get-object-properties';

describe('getObjectProperties', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
const a = {
  b: 1;
}
`,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
const b = {
  d: 's';

  hello2: 'hello';
}
`,
    );
  });

  it('should find two properties', () => {
    const declarations = getObjectProperties(
      getVariables('some/path/**.ts')
        ?.map((v) => v.getDeclarations())
        .flat()
        .map((d) => d.getInitializer())
        .flat() as ObjectLiteralExpression[],
    );

    expect(declarations.length).toBe(3);
  });

  it('should find one property', () => {
    const declarations = getObjectProperties(
      getVariables('some/path/file.ts')
        .at(0)
        ?.getDeclarations()
        .at(0)
        ?.getInitializer() as ObjectLiteralExpression,
    );

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
