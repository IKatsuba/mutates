import type { FilterPrimitive } from '../types/filter-primitive';
import type { StructureType } from '../types/structure-type';
import type { StructuredStatement } from '../types/structured-statement';
import { OptionalKind } from './optional-kind';

export type StructureEditor<
  Declaration extends StructuredStatement<Declaration>,
  Structure extends OptionalKind<StructureType<Declaration>> = OptionalKind<
    StructureType<Declaration>
  >,
  UpdatableData extends FilterPrimitive<Structure> = FilterPrimitive<Structure>,
> = (structure: Structure, declaration: Declaration) => Partial<UpdatableData>;
