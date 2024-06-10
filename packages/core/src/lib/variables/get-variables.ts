import type { VariableStatement } from 'ts-morph';

import { getSourceFiles } from '../source-file';
import { getDeclarationGetter } from '../utils';

export const getVariables = getDeclarationGetter<VariableStatement>((pattern) =>
  getSourceFiles(pattern)
    .map((file) => file.getVariableStatements())
    .flat(),
);
