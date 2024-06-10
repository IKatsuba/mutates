import { readFileSync } from '@mutates/core';

import { createAngularProject } from './create-angular-project';
import { createTestingTree } from './testing';

describe('createAngularProject', () => {
  it('should call createAngularProject with correct arguments and return expected result', async () => {
    const tree = createTestingTree();

    tree.create('/test.ts', `console.log('Hello, world!');`);

    createAngularProject(tree);

    expect(readFileSync('/test.ts')).toEqual("console.log('Hello, world!');");
  });
});
