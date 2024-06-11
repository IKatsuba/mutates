import { ImportDeclaration, ImportSpecifier, ImportSpecifierStructure } from 'ts-morph';

import { coerceArray, matchQuery, type Query } from '../utils';

export function getNamedImports(
  imports: ImportDeclaration | ImportDeclaration[],
  query?: Query<Omit<ImportSpecifierStructure, 'kind'>>,
): ImportSpecifier[] {
  return coerceArray(imports)
    .flatMap((imp) => imp.getNamedImports())
    .filter((named) => matchQuery(named.getStructure(), query));
}
