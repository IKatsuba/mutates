import { Node, Structure } from 'ts-morph';

import type { StructureEditor } from '../../utils';
import { coerceArray } from '../../utils';
import type { StructureType } from '../../utils/types/structure-type';
import { OptionalKind } from '../types/optional-kind';
import type { StructuredStatement } from '../types/structured-statement';

export function getDeclarationEditor<
  Declaration extends StructuredStatement<Declaration>,
  Structures extends StructureType<Declaration> = StructureType<Declaration>,
>() {
  return function editDeclarations(
    declarations: Declaration | Declaration[],
    editor: StructureEditor<Declaration, OptionalKind<Structures>>,
  ) {
    coerceArray(declarations).forEach((declaration) => {
      const newStructure = Object.assign(
        {},
        declaration.getStructure(),
        // TODO: refactor it to support new typings
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        editor(declaration.getStructure(), declaration),
      ) as Structures;

      // todo: see https://github.com/dsherret/ts-morph/issues/882
      // if the issue is resolved code will be remove
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      if (Structure.hasName(newStructure) && Node.isRenameable(declaration)) {
        declaration.rename(newStructure.name);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
        delete newStructure.name;
      }

      declaration.set(newStructure);
    });
  };
}
