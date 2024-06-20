import { createTree } from '@nx/devkit/testing';

import { readFileSync } from '@mutates/core';

import { createNxProject } from './create-nx-project';

describe('createNxProject', () => {
  it('should call createProject with the correct file system', () => {
    const tree = createTree();

    tree.write('/test.ts', `console.log('Hello, world!');`);

    createNxProject(tree);

    expect(readFileSync('/test.ts')).toEqual("console.log('Hello, world!');");
  });
});
