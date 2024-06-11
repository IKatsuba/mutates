import { FileSystemHost, Project, ProjectOptions } from 'ts-morph';

import { Pattern } from '../utils';

let prevProject: Project | null = null;

function setActiveProject(project: Project | null): Project | null {
  const prev = prevProject;

  prevProject = project;

  return prev;
}

export function getActiveProject(): Project {
  if (prevProject === null) {
    throw new Error('No active project');
  }

  return prevProject;
}

export function resetActiveProject(): Project | null {
  return setActiveProject(null);
}

export function createProject(
  fileSystem?: FileSystemHost,
  options?: Omit<ProjectOptions, 'fileSystem'>,
): Project {
  const project = new Project({ fileSystem, ...options });

  setActiveProject(project);

  return project;
}

export async function saveActiveProjectAsync(): Promise<void> {
  await getActiveProject().save();
}

export function saveProject(): void {
  getActiveProject().saveSync();
}

export function addSourceFiles(paths: Pattern): void {
  getActiveProject().addSourceFilesAtPaths(paths);
}
