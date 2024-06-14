import { ClassDeclaration } from 'ts-morph';

import { pushToMetadataProperty } from '../push-to-metadata-property';

export function addProviders(ngEntity: ClassDeclaration, providers: string[]): void {
  pushToMetadataProperty(ngEntity, 'providers', providers);
}
