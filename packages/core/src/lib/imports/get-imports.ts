import type { ImportDeclaration } from 'ts-morph';

import { getSourceFiles } from '../source-file';
import { getDeclarationGetter } from '../utils';

export const getImports = getDeclarationGetter<ImportDeclaration>((pattern) => {
  const sourceFiles = getSourceFiles(pattern);

  return sourceFiles.map((file) => file.getImportDeclarations()).flat();
});
