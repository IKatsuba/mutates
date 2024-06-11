import {
  AccessorDeclaration,
  ClassDeclaration,
  GetAccessorDeclarationStructure,
  Node,
  ObjectLiteralExpression,
  SetAccessorDeclarationStructure,
} from 'ts-morph';

import type { Query } from '../utils';
import { coerceArray, matchQuery } from '../utils';

export function getClassAccessors(
  classes: ClassDeclaration | ClassDeclaration[],
  query?: Query<GetAccessorDeclarationStructure | SetAccessorDeclarationStructure>,
): AccessorDeclaration[] {
  return coerceArray(classes)
    .map((klass) => [...klass.getGetAccessors(), ...klass.getSetAccessors()])
    .flat()
    .filter((accessor) => matchQuery(accessor.getStructure(), query));
}

export function getObjectAccessors(
  objects: ObjectLiteralExpression | ObjectLiteralExpression[],
  query?: Query<GetAccessorDeclarationStructure | SetAccessorDeclarationStructure>,
): AccessorDeclaration[] {
  const accessors = coerceArray(objects)
    .map((object) => object.getProperties())
    .flat()
    .filter(
      (accessor) =>
        Node.isGetAccessorDeclaration(accessor) || Node.isSetAccessorDeclaration(accessor),
    ) as AccessorDeclaration[];

  return accessors.filter((accessor) => matchQuery(accessor.getStructure(), query));
}

export function getAccessors(
  classes:
    | ClassDeclaration
    | ObjectLiteralExpression
    | Array<ClassDeclaration | ObjectLiteralExpression>,
  query?: Query<GetAccessorDeclarationStructure | SetAccessorDeclarationStructure>,
): AccessorDeclaration[] {
  return coerceArray(classes)
    .map((klass) => {
      if (Node.isClassDeclaration(klass)) {
        return getClassAccessors(klass, query);
      }

      return getObjectAccessors(klass, query);
    })
    .filter(Boolean)
    .flat();
}
