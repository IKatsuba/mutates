import {
  ClassDeclaration,
  GetAccessorDeclarationStructure,
  ObjectLiteralExpression,
  SetAccessorDeclarationStructure,
  Structure,
} from 'ts-morph';

import { coerceArray } from '../utils';

export function addAccessors(
  classes:
    | ClassDeclaration
    | ObjectLiteralExpression
    | Array<ClassDeclaration | ObjectLiteralExpression>,
  accessors:
    | Array<GetAccessorDeclarationStructure | SetAccessorDeclarationStructure>
    | GetAccessorDeclarationStructure
    | SetAccessorDeclarationStructure,
): void {
  coerceArray(classes).forEach((klass) => {
    coerceArray(accessors).forEach((accessor) => {
      if (Structure.isGetAccessor(accessor)) {
        klass.addGetAccessor(accessor);
      } else {
        klass.addSetAccessor(accessor);
      }
    });
  });
}
