import { InMemoryFileSystemHost, Project } from 'ts-morph';

import { createProject } from '../project';

export function createTestingProject(): Project {
  return createProject(new InMemoryFileSystemHost());
}
