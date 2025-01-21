import { ClassDeclaration } from 'ts-morph';

import { getClasses, Pattern, Query, StructureType } from '@mutates/core';

export function getInjectables(
  pattern: Pattern,
  query?: Query<Omit<StructureType<ClassDeclaration>, 'kind'>>,
): ClassDeclaration[] {
  return getClasses(pattern, query).filter(isInjectable);
}

export function isInjectable(declaration: ClassDeclaration): boolean {
  return !!declaration.getDecorator('Injectable');
}
