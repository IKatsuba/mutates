import {
  Node,
  ObjectLiteralExpression,
  PropertyAssignment,
  PropertyAssignmentStructure,
} from 'ts-morph';

import type { Query } from '../utils';
import { coerceArray, matchQuery } from '../utils';

export function getObjectProperties<T extends ObjectLiteralExpression>(
  objs: T | T[],
  query?: Query<PropertyAssignmentStructure>,
): Array<PropertyAssignment> {
  return coerceArray(objs)
    .map((obj) => obj.getProperties())
    .flat()
    .filter((property): property is PropertyAssignment => Node.isPropertyAssignment(property))
    .filter((method) => matchQuery(method.getStructure(), query));
}
