import type { ClassDeclaration } from 'ts-morph';

import { getClasses, Pattern, Query, StructureType } from '@mutates/core';

export function getComponents(
  query?: Query<Omit<StructureType<ClassDeclaration>, 'kind'>> & { pattern: Pattern },
): ClassDeclaration[] {
  return getClasses(query).filter(isComponent);
}

export function isComponent(declaration: ClassDeclaration): boolean {
  return !!declaration.getDecorator('Component');
}
