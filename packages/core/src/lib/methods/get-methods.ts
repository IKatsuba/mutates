import type { ClassDeclaration, MethodDeclaration, MethodDeclarationStructure } from 'ts-morph';

import type { Query } from '../utils';
import { coerceArray, matchQuery } from '../utils';

export function getMethods(
  classes: ClassDeclaration | ClassDeclaration[],
  query?: Query<MethodDeclarationStructure>,
): MethodDeclaration[] {
  return coerceArray(classes)
    .map((klass) => klass.getMethods())
    .flat()
    .filter((method) => !method.isOverload() && matchQuery(method.getStructure(), query));
}
