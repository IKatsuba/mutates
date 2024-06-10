import type { ClassDeclaration } from 'ts-morph';

import { getSourceFiles } from '../source-file';
import { getDeclarationGetter } from '../utils';

export const getClasses = getDeclarationGetter<ClassDeclaration>((pattern) =>
  getSourceFiles(pattern)
    .map((file) => file.getClasses())
    .flat(),
);
