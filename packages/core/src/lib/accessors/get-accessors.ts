import type {
  AccessorDeclaration,
  ClassDeclaration,
  GetAccessorDeclarationStructure,
  SetAccessorDeclarationStructure,
} from 'ts-morph';

import type { Query } from '../utils';
import { coerceArray, matchQuery } from '../utils';

export function getAccessors(
  classes: ClassDeclaration | ClassDeclaration[],
  query?: Query<GetAccessorDeclarationStructure | SetAccessorDeclarationStructure>,
): AccessorDeclaration[] {
  return coerceArray(classes)
    .map((klass) => [...klass.getGetAccessors(), ...klass.getSetAccessors()])
    .flat()
    .filter((accessor) => matchQuery(accessor.getStructure(), query));
}
