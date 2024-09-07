import { ClassDeclaration } from 'ts-morph';

import { getObjectProperties } from '@mutates/core';

import { MetadataProperty } from '../types/metadata-property';
import { getMetadata } from './get-metadata';

export function removeMetadataProperty<T extends MetadataProperty>(
  klass: ClassDeclaration,
  property: T,
): void {
  const [metadata] = getMetadata(klass);

  const prop = getObjectProperties(metadata, {
    name: property as string,
  }).at(0);

  prop?.remove();
}
