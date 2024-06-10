import type { ExportDeclaration } from 'ts-morph';

import { getSourceFiles } from '../source-file';
import { getDeclarationGetter } from '../utils';

export const getExports = getDeclarationGetter<ExportDeclaration>((pattern) => {
  const sourceFiles = getSourceFiles(pattern);

  return sourceFiles.map((file) => file.getExportDeclarations()).flat();
});
