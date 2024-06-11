import { Tree } from '@angular-devkit/schematics';
import { ProjectOptions } from 'ts-morph';

import { createProject } from '@mutates/core';

import { NgTreeFileSystem } from './ng-tree-file-system';

export function createAngularProject(tree: Tree, options?: Omit<ProjectOptions, 'fileSystem'>) {
  return createProject(new NgTreeFileSystem(tree), options);
}
