import type { ClassDeclaration } from 'ts-morph';

import { getClasses, Pattern, Query, StructureType } from '@mutates/core';

export function getNgModule(
  query?: Query<Omit<StructureType<ClassDeclaration>, 'kind'>> & { pattern: Pattern },
): ClassDeclaration[] {
  return getClasses(query).filter(isNgModule);
}

export function isNgModule(declaration: ClassDeclaration): boolean {
  return !!declaration.getDecorator('NgModule');
}
