import type { ClassDeclaration } from 'ts-morph';

import { getClasses, Pattern, Query, StructureType } from '@mutates/core';

export function getPipes(
  query?: Query<Omit<StructureType<ClassDeclaration>, 'kind'>> & { pattern: Pattern },
): ClassDeclaration[] {
  return getClasses(query).filter(isPipe);
}

export function isPipe(declaration: ClassDeclaration): boolean {
  return !!declaration.getDecorator('Pipe');
}
