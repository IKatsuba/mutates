import type { FunctionDeclaration, FunctionDeclarationStructure } from 'ts-morph';

import { getSourceFiles } from '../source-file';
import { getDeclarationGetter } from '../utils';

export const getFunctions = getDeclarationGetter<FunctionDeclaration, FunctionDeclarationStructure>(
  (pattern) => {
    const files = getSourceFiles(pattern);

    return files
      .map((file) => file.getFunctions())
      .flat()
      .filter((fn) => !fn.isOverload());
  },
);
