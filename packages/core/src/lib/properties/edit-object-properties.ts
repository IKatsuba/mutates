import { PropertyAssignment, PropertyAssignmentStructure } from 'ts-morph';

import { getDeclarationEditor } from '../utils';

export const editObjectProperties = getDeclarationEditor<
  PropertyAssignment,
  PropertyAssignmentStructure
>();
