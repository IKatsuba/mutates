import { ClassDeclaration } from 'ts-morph';

import { getObjectProperties } from '@mutates/core';

import { getMetadata, MetadataType } from '../metadata/get-metadata';

export function isStandalone(ngEntity: ClassDeclaration): boolean {
  const [metadata] = getMetadata(ngEntity, [
    MetadataType.NgModule,
    MetadataType.Component,
    MetadataType.Directive,
    MetadataType.Pipe,
    MetadataType.Injectable,
  ]);

  if (!metadata) {
    return false;
  }

  const [property] = getObjectProperties(metadata, {
    name: 'standalone',
  });

  if (!property) {
    return false;
  }

  return property.getInitializer()?.getText() === 'true';
}
