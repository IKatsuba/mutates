import type { EnumDeclaration } from 'ts-morph';

import { getSourceFiles } from '../source-file';
import { getDeclarationGetter } from '../utils';

export const getEnums = getDeclarationGetter<EnumDeclaration>((pattern) =>
  getSourceFiles(pattern)
    .map((file) => file.getEnums())
    .flat(),
);
