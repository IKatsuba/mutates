import { ClassDeclaration } from 'ts-morph';

import { getObjectProperties } from '@mutates/core';

import { MetadataProperty } from '../types/metadata-property';
import { getMetadata } from './get-metadata';

export function setMetadataProperty<T extends MetadataProperty>(
  klass: ClassDeclaration,
  property: T,
  value: string,
): void {
  const [metadata] = getMetadata(klass);

  const prop = getObjectProperties(metadata, {
    name: property as string,
  }).at(0);

  if (prop) {
    prop.setInitializer(value);
  } else {
    metadata.addPropertyAssignment({
      name: property as string,
      initializer: value,
    });
  }
}
