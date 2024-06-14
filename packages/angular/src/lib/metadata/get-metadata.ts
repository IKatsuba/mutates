import { ClassDeclaration, Node, ObjectLiteralExpression } from 'ts-morph';

import { getDecorators } from '@mutates/core';

export enum MetadataType {
  NgModule = 'NgModule',
  Component = 'Component',
  Directive = 'Directive',
  Pipe = 'Pipe',
  Injectable = 'Injectable',
}

export function getMetadata(
  klass: ClassDeclaration | ClassDeclaration[],
  metadataType: MetadataType | MetadataType[] = [
    MetadataType.NgModule,
    MetadataType.Component,
    MetadataType.Directive,
    MetadataType.Pipe,
    MetadataType.Injectable,
  ],
): ObjectLiteralExpression[] {
  const decorators = getDecorators(klass, {
    name: metadataType,
  });

  const metadatas = decorators.map((decorator) => decorator.getArguments()).flat();

  return metadatas.filter((metadata): metadata is ObjectLiteralExpression =>
    Node.isObjectLiteralExpression(metadata),
  );
}

export function getNgModuleMetadata(
  klass: ClassDeclaration | ClassDeclaration[],
): ObjectLiteralExpression[] {
  return getMetadata(klass, MetadataType.NgModule);
}

export function getComponentMetadata(
  klass: ClassDeclaration | ClassDeclaration[],
): ObjectLiteralExpression[] {
  return getMetadata(klass, MetadataType.Component);
}

export function getDirectiveMetadata(
  klass: ClassDeclaration | ClassDeclaration[],
): ObjectLiteralExpression[] {
  return getMetadata(klass, MetadataType.Directive);
}

export function getPipeMetadata(
  klass: ClassDeclaration | ClassDeclaration[],
): ObjectLiteralExpression[] {
  return getMetadata(klass, MetadataType.Pipe);
}

export function getInjectableMetadata(
  klass: ClassDeclaration | ClassDeclaration[],
): ObjectLiteralExpression[] {
  return getMetadata(klass, MetadataType.Injectable);
}
