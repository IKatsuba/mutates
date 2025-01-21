import { Node } from 'ts-morph';

import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getFunctions } from './get-functions';

describe('getFunctions', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
function a(){
  return 'a'
}
`,
    );
  });

  it('should find all functions', () => {
    const functions = getFunctions('some/**/**.ts');

    expect(functions.map(Node.isFunctionDeclaration)).toEqual([true]);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
