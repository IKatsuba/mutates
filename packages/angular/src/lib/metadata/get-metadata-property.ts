import { ClassDeclaration, PropertyAssignment } from 'ts-morph';

import { getObjectProperties } from '@mutates/core';

import { MetadataProperty } from '../types/metadata-property';
import { getMetadata } from './get-metadata';

export function getMetadataProperty<T extends MetadataProperty>(
  klass: ClassDeclaration,
  property: T,
): PropertyAssignment | undefined {
  const [metadata] = getMetadata(klass);

  if (!metadata) {
    return;
  }

  return getObjectProperties(metadata, {
    name: property as string,
  }).at(0);
}
