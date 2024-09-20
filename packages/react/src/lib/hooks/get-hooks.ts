import { getFunctions, Pattern, Query, StructureType } from '@mutates/core';

export function getHooks(
  pattern: Pattern,
  query?: Query<Omit<StructureType<FunctionDeclaration>, 'kind'>>,
): FunctionDeclaration[] {
  return getFunctions(pattern, query).filter(isHook);
}

export function isHook(declaration: FunctionDeclaration): boolean {
  return declaration.getName()?.startsWith('use') ?? false;
}
