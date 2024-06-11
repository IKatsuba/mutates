import type { CallExpression } from 'ts-morph';
import { Node, SyntaxKind } from 'ts-morph';

import { getImportRefs, getImports, getNamedImports } from '@mutates/core';

export function getBootstrapModuleFn(mainFilePath: string): CallExpression | undefined {
  const namedImport = getNamedImports(
    getImports(mainFilePath, {
      moduleSpecifier: '@angular/platform-browser-dynamic',
    }),
    {
      name: 'platformBrowserDynamic',
    },
  );

  return getImportRefs(namedImport)
    .find((ref) => Node.isCallExpression(ref.getParent()))
    ?.getParentIfKind(SyntaxKind.CallExpression)
    ?.getParentIfKind(SyntaxKind.PropertyAccessExpression)
    ?.getParentIfKind(SyntaxKind.CallExpression);
}
