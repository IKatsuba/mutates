import type { SourceFile } from 'ts-morph';

import { getActiveProject } from '../project';
import { Pattern } from '../utils';

export function getSourceFiles(pattern?: Pattern): SourceFile[] {
  return getActiveProject().getSourceFiles(pattern as string);
}

export function getSourceFile(filePath: string): SourceFile | null {
  return getActiveProject().getSourceFile(filePath) ?? null;
}
