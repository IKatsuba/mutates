import type { ClassDeclaration } from 'ts-morph';

import { getClasses, Pattern, Query, StructureType } from '@mutates/core';

export function getComponents(
  pattern: Pattern,
  query?: Query<Omit<StructureType<ClassDeclaration>, 'kind'>>,
): ClassDeclaration[] {
  return getClasses(pattern, query).filter(isComponent);
}

export function isComponent(declaration: ClassDeclaration): boolean {
  return !!declaration.getDecorator('Component');
}
