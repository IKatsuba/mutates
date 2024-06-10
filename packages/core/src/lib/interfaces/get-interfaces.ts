import type { InterfaceDeclaration } from 'ts-morph';

import { getSourceFiles } from '../source-file';
import { getDeclarationGetter } from '../utils';

export const getInterfaces = getDeclarationGetter<InterfaceDeclaration>((pattern) =>
  getSourceFiles(pattern)
    .map((file) => file.getInterfaces())
    .flat(),
);
