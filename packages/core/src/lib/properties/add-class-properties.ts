import type { ClassDeclaration, OptionalKind, PropertyDeclarationStructure } from 'ts-morph';

import { coerceArray } from '../utils';

export function addClassProperties(
  classes: ClassDeclaration | ClassDeclaration[],
  properties:
    | Array<OptionalKind<PropertyDeclarationStructure>>
    | OptionalKind<PropertyDeclarationStructure>,
): void {
  coerceArray(classes).forEach((klass) => {
    klass.addProperties(coerceArray(properties));
  });
}
