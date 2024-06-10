import { StructureKind } from 'ts-morph';

export type OptionalKind<T> = Omit<T, 'kind'> & { kind?: StructureKind };
