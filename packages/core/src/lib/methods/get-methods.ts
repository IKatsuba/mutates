import {
  ClassDeclaration,
  MethodDeclaration,
  MethodDeclarationStructure,
  Node,
  ObjectLiteralExpression,
} from 'ts-morph';

import type { Query } from '../utils';
import { coerceArray, matchQuery } from '../utils';

export function getClassMethods(
  classes: ClassDeclaration | ClassDeclaration[],
  query?: Query<MethodDeclarationStructure>,
): MethodDeclaration[] {
  return coerceArray(classes)
    .map((klass) => klass.getMethods())
    .flat()
    .filter((method) => !method.isOverload() && matchQuery(method.getStructure(), query));
}

export function getObjectMethods(
  objects: ObjectLiteralExpression | ObjectLiteralExpression[],
  query?: Query<MethodDeclarationStructure>,
): MethodDeclaration[] {
  const methods = coerceArray(objects)
    .map((object) => object.getProperties())
    .flat()
    .filter((accessor) => Node.isMethodDeclaration(accessor)) as MethodDeclaration[];

  return methods.filter(
    (method) => !method.isOverload() && matchQuery(method.getStructure(), query),
  );
}

export function getMethods(
  classes:
    | ClassDeclaration
    | ObjectLiteralExpression
    | Array<ClassDeclaration | ObjectLiteralExpression>,
  query?: Query<MethodDeclarationStructure>,
): MethodDeclaration[] {
  return coerceArray(classes)
    .map((klass) => {
      if (Node.isClassDeclaration(klass)) {
        return getClassMethods(klass, query);
      }

      return getObjectMethods(klass, query);
    })
    .flat();
}
