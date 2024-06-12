import type { ClassDeclaration, Identifier } from 'ts-morph';

import { getBootstrapModuleFn } from '../bootstrap';

export function getAppModule(mainFilePath: string): ClassDeclaration {
  const bootstrapFn = getBootstrapModuleFn(mainFilePath);

  const [mainModuleIdentifier] = bootstrapFn?.getArguments() as [Identifier];

  const [mainModuleClass] = mainModuleIdentifier.getDefinitionNodes() as [ClassDeclaration];

  return mainModuleClass;
}
