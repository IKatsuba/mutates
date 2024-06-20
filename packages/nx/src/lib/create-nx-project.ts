import { Tree } from '@nx/devkit';
import { Project, ProjectOptions } from 'ts-morph';

import { createProject } from '@mutates/core';

import { NxTreeFileSystem } from './nx-tree-file-system';

export function createNxProject(host: Tree, options?: Omit<ProjectOptions, 'fileSystem'>): Project {
  return createProject(new NxTreeFileSystem(host), options);
}
