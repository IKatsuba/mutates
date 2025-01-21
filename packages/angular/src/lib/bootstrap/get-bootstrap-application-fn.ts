import type { CallExpression } from 'ts-morph';
import { Node, SyntaxKind } from 'ts-morph';

import { getImportRefs, getImports, getNamedImports } from '@mutates/core';

export function getBootstrapApplicationFn(mainFilePath: string): CallExpression | undefined {
  const [namedImport] = getNamedImports(
    getImports({
      moduleSpecifier: '@angular/platform-browser',
      pattern: mainFilePath,
    }),
    {
      name: 'bootstrapApplication',
    },
  );

  if (!namedImport) {
    return;
  }

  return getImportRefs(namedImport)
    .find((ref) => Node.isCallExpression(ref.getParent()))
    ?.getParentIfKind(SyntaxKind.CallExpression);
}
