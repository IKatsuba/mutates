import { ClassDeclaration } from 'ts-morph';

import { removeItemFromMetadataProperty } from '../remove-item-from-metadata-property';

export function removeProviders(ngEntity: ClassDeclaration, providers: string[]): void {
  removeItemFromMetadataProperty(ngEntity, 'providers', providers);
}
