import type { ClassDeclaration } from 'ts-morph';

import { getClasses, Pattern, Query, StructureType } from '@mutates/core';

export function getDirectives(
  query?: Query<Omit<StructureType<ClassDeclaration>, 'kind'>> & { pattern: Pattern },
): ClassDeclaration[] {
  return getClasses(query).filter(isDirective);
}

export function isDirective(declaration: ClassDeclaration): boolean {
  return !!declaration.getDecorator('Directive');
}
