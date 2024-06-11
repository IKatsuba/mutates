import type { PropertyDeclaration, PropertyDeclarationStructure } from 'ts-morph';

import { getDeclarationEditor } from '../utils';

export const editClassProperties = getDeclarationEditor<
  PropertyDeclaration,
  PropertyDeclarationStructure
>();
