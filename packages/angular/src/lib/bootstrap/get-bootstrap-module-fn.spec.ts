import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { Node } from 'ts-morph';

import { createSourceFile } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { getBootstrapModuleFn } from './get-bootstrap-module-fn';

describe('getBootstrapFn', () => {
  let host: UnitTestTree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  it('should find the bootstrap function', () => {
    createSourceFile(
      'src/main.ts',
      `import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AppModule} from './app/app.module';
import {environment} from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch(err => console.log(err));
`,
    );
    const bootstrapFn = getBootstrapModuleFn('src/main.ts')!;

    expect(bootstrapFn.getText()).toBe(`platformBrowserDynamic()
  .bootstrapModule(AppModule)`);
    expect(Node.isCallExpression(bootstrapFn)).toBe(true);
  });

  it('should return undefined if bootstrap function is not found', () => {
    createSourceFile('src/main.ts', '');
    const bootstrapFn = getBootstrapModuleFn('src/main.ts');

    expect(bootstrapFn).toBeUndefined();
  });
});
