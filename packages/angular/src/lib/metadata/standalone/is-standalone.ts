import { ClassDeclaration } from 'ts-morph';

import { getMetadataProperty } from '../get-metadata-property';

export function isStandalone(ngEntity: ClassDeclaration): boolean {
  const property = getMetadataProperty(ngEntity, 'standalone');

  if (!property) {
    return false;
  }

  return property.getInitializer()?.getText() === 'true';
}
