import type { PropertyAssignment } from 'ts-morph';

import { getDeclarationRemover } from '../utils';

export const removeObjectProperties = getDeclarationRemover<PropertyAssignment>();
