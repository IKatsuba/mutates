import type {
  ClassDeclaration,
  ConstructorDeclaration,
  ConstructorDeclarationStructure,
} from 'ts-morph';

import type { Query } from '../utils';
import { coerceArray, matchQuery } from '../utils';

export function getConstructors(
  classes: ClassDeclaration | ClassDeclaration[],
  query?: Query<ConstructorDeclarationStructure>,
): ConstructorDeclaration[] {
  return coerceArray(classes)
    .map((klass) => klass.getConstructors())
    .flat()
    .filter(
      (constructor) => !constructor.isOverload() && matchQuery(constructor.getStructure(), query),
    );
}
