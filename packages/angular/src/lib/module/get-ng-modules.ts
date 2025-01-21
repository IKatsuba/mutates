import type { ClassDeclaration } from 'ts-morph';

import { getClasses, Pattern, Query, StructureType } from '@mutates/core';

export function getNgModule(
  pattern: Pattern,
  query?: Query<Omit<StructureType<ClassDeclaration>, 'kind'>>,
): ClassDeclaration[] {
  return getClasses(pattern, query).filter(isNgModule);
}

export function isNgModule(declaration: ClassDeclaration): boolean {
  return !!declaration.getDecorator('NgModule');
}
