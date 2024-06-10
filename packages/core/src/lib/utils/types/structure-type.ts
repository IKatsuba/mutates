import type { Node } from 'ts-morph';

export type StructureType<T> = T extends Node & {
  getStructure(): infer S;
}
  ? S
  : never;
