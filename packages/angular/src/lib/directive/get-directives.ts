import type { ClassDeclaration } from 'ts-morph';

import { getClasses, Pattern, Query, StructureType } from '@mutates/core';

export function getDirectives(
  pattern: Pattern,
  query?: Query<Omit<StructureType<ClassDeclaration>, 'kind'>>,
): ClassDeclaration[] {
  return getClasses(pattern, query).filter(isDirective);
}

export function isDirective(declaration: ClassDeclaration): boolean {
  return !!declaration.getDecorator('Directive');
}
