import { ClassDeclaration, SyntaxKind } from 'ts-morph';

import { getObjectProperties, pushToArrayIfNotExists, removeFromArray } from '@mutates/core';

import { MetadataProperty } from '../types/metadata-property';
import { getMetadata } from './get-metadata';

export function removeItemFromMetadataProperty<T extends MetadataProperty>(
  klass: ClassDeclaration,
  property: T,
  values: string[],
): void {
  const [metadata] = getMetadata(klass);

  const prop = getObjectProperties(metadata, {
    name: property as string,
  }).at(0);

  if (prop) {
    const initializer = prop.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);

    if (initializer) {
      removeFromArray(initializer, ...values);
    }
  }
}
