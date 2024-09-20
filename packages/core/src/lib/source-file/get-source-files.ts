import type { SourceFile } from 'ts-morph';

import { getActiveProject } from '../project';
import { Pattern } from '../utils';

export function getSourceFiles(pattern?: Pattern): SourceFile[] {
  return getActiveProject()
    .getSourceFiles(pattern as string)
    .filter((file) => !file.isFromExternalLibrary());
}

export function getSourceFile(filePath: string): SourceFile | null {
  const file = getActiveProject().getSourceFile(filePath);

  return file && !file.isFromExternalLibrary() ? file : null;
}
