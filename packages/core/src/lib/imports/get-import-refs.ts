import { ImportSpecifier, Node } from 'ts-morph';

import { coerceArray } from '../utils';

export function getImportRefs(imports: ImportSpecifier | ImportSpecifier[]): Node[] {
  const importNames = coerceArray(imports).map((imp) => imp.getName());

  return coerceArray(imports)
    .flatMap((imp) => imp.getNameNode().findReferencesAsNodes())
    .filter((node) => {
      const parent = node.getParent();

      if (parent && Node.isImportSpecifier(parent)) {
        return !importNames.includes(parent.getName());
      }

      return true;
    });
}
