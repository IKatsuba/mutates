import type { ClassDeclaration } from 'ts-morph';

import { pushToDecoratorArrayProperty } from '../helpers/push-to-decorator-array-property';

export function addImportToComponent(
  classDeclaration: ClassDeclaration,
  importName: string,
  { unique = false }: { unique?: boolean } = {},
): void {
  pushToDecoratorArrayProperty(classDeclaration, 'Component', 'imports', importName, {
    unique,
    forceToArray: true,
  });
}
