import { ArrayLiteralExpression, ObjectLiteralExpression, SyntaxKind } from 'ts-morph';

import { getObjectProperties, pushToArrayIfNotExists } from '@mutates/core';

import { getBootstrapApplicationFn } from '../../bootstrap';
import { getAppModule } from '../../module';
import { getMetadataProperty } from '../index';

export function getAppProviders(mainFilePath: string): ArrayLiteralExpression | undefined {
  const appModule = getAppModule(mainFilePath);

  if (appModule) {
    return getMetadataProperty(appModule, 'providers')?.getInitializerIfKind(
      SyntaxKind.ArrayLiteralExpression,
    );
  }

  const boostrapApplicationFn = getBootstrapApplicationFn(mainFilePath);

  if (!boostrapApplicationFn) {
    return;
  }
  const config = (boostrapApplicationFn.getArguments().at(1) ??
    boostrapApplicationFn.addArgument(`{providers: []}`)) as ObjectLiteralExpression;

  return getObjectProperties(config, { name: 'providers' })
    .at(0)
    ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
}

export function addAppProviders(mainFilePath: string, providers: string[]): void {
  const appProviders = getAppProviders(mainFilePath);

  if (!appProviders) {
    return;
  }

  pushToArrayIfNotExists(appProviders, ...providers);
}
