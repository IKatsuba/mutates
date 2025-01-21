import { Identifier, ImportSpecifier, Node } from 'ts-morph';

import { coerceArray } from '../utils';

export function getImportRefs(imports: ImportSpecifier | ImportSpecifier[]): Node[] {
  const importNames = coerceArray(imports).map((imp) => imp.getName());

  return coerceArray(imports)
    .filter((imp) => Node.isIdentifier(imp.getNameNode()))
    .flatMap((imp) => (imp.getNameNode() as Identifier).findReferencesAsNodes())
    .filter((node) => {
      const parent = node.getParent();

      if (parent && Node.isImportSpecifier(parent)) {
        return !importNames.includes(parent.getName());
      }

      return true;
    });
}
