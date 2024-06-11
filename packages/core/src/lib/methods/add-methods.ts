import type {
  ClassDeclaration,
  MethodDeclarationStructure,
  ObjectLiteralExpression,
  OptionalKind,
} from 'ts-morph';

import { coerceArray } from '../utils';

export function addMethods(
  classes:
    | ClassDeclaration
    | ObjectLiteralExpression
    | Array<ClassDeclaration | ObjectLiteralExpression>,
  methods:
    | Array<OptionalKind<MethodDeclarationStructure>>
    | OptionalKind<MethodDeclarationStructure>,
): void {
  coerceArray(classes).forEach((klass) => {
    klass.addMethods(coerceArray(methods));
  });
}
