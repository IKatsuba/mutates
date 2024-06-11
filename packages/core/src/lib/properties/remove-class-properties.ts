import type { PropertyDeclaration } from 'ts-morph';

import { getDeclarationRemover } from '../utils';

export const removeClassProperties = getDeclarationRemover<PropertyDeclaration>();
