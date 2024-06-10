import type { TypeAliasDeclaration } from 'ts-morph';

import { getSourceFiles } from '../source-file';
import { getDeclarationGetter } from '../utils';

export const getTypeAliases = getDeclarationGetter<TypeAliasDeclaration>((pattern) =>
  getSourceFiles(pattern)
    .map((file) => file.getTypeAliases())
    .flat(),
);
