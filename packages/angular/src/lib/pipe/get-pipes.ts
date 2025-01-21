import type { ClassDeclaration } from 'ts-morph';

import { getClasses, Pattern, Query, StructureType } from '@mutates/core';

export function getPipes(
  pattern: Pattern,
  query?: Query<Omit<StructureType<ClassDeclaration>, 'kind'>>,
): ClassDeclaration[] {
  return getClasses(pattern, query).filter(isPipe);
}

export function isPipe(declaration: ClassDeclaration): boolean {
  return !!declaration.getDecorator('Pipe');
}
