import {
  ObjectLiteralExpression,
  OptionalKind,
  PropertyAssignmentStructure,
  StructureKind,
} from 'ts-morph';

import { coerceArray } from '../utils';

export function addObjectProperty(
  obj: ObjectLiteralExpression | ObjectLiteralExpression[],
  properties:
    | Array<OptionalKind<PropertyAssignmentStructure>>
    | OptionalKind<PropertyAssignmentStructure>,
): void {
  coerceArray(obj).forEach((object) => {
    object.addProperties(
      coerceArray(properties).map((property) => ({
        ...property,
        kind: StructureKind.PropertyAssignment,
      })),
    );
  });
}
