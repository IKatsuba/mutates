import { Tree } from '@angular-devkit/schematics';

import { createProject } from '@mutates/core';

import { NgTreeFileSystem } from './ng-tree-file-system';

export function createAngularProject(tree: Tree) {
  const project = createProject(new NgTreeFileSystem(tree));

  project.addSourceFilesAtPaths('**/*.ts');

  return project;
}
