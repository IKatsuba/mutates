import { ClassDeclaration } from 'ts-morph';

import { getClasses, Pattern, Query, StructureType } from '@mutates/core';

export function getInjectables(
  query?: Query<Omit<StructureType<ClassDeclaration>, 'kind'>> & { pattern: Pattern },
): ClassDeclaration[] {
  return getClasses(query).filter(isInjectable);
}

export function isInjectable(declaration: ClassDeclaration): boolean {
  return !!declaration.getDecorator('Injectable');
}
