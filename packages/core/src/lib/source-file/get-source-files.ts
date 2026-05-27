import type { SourceFile } from 'ts-morph';

import { getActiveProject } from '../project';
import { Pattern } from '../utils';

export function getSourceFiles(pattern?: Pattern): SourceFile[] {
  const project = getActiveProject();
  const files =
    pattern === undefined
      ? project.getSourceFiles()
      : typeof pattern === 'string'
        ? project.getSourceFiles(pattern)
        : project.getSourceFiles(pattern as readonly string[]);
  return files.filter((file) => !file.isFromExternalLibrary());
}

export function getSourceFile(filePath: string): SourceFile | null {
  const file = getActiveProject().getSourceFile(filePath);

  return file && !file.isFromExternalLibrary() ? file : null;
}
