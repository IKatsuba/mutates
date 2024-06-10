import { ClassDeclaration, PropertyDeclaration, PropertyDeclarationStructure } from 'ts-morph';

import type { Query } from '../utils';
import { coerceArray, matchQuery } from '../utils';

export function getProperties<T extends ClassDeclaration>(
  classes: T | T[],
  query?: Query<PropertyDeclarationStructure>,
): Array<PropertyDeclaration> {
  return coerceArray(classes)
    .map((klass) => klass.getProperties())
    .flat()
    .filter((method) => matchQuery(method.getStructure(), query));
}
