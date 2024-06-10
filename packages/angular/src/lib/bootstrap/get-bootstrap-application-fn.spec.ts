import type { UnitTestTree } from '@angular-devkit/schematics/testing';
import { Node } from 'ts-morph';

import { createSourceFile } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { getBootstrapApplicationFn } from './get-bootstrap-application-fn';

describe('getBootstrapApplicationFn', () => {
  let host: UnitTestTree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  it('should find the bootstrap function', () => {
    createSourceFile(
      'src/main.ts',
      `import {bootstrapApplication} from '@angular/platform-browser';
import {AppComponent} from './app/app.component';
import {environment} from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent)
`,
    );
    const bootstrapFn = getBootstrapApplicationFn('src/main.ts')!;

    expect(bootstrapFn.getText()).toBe('bootstrapApplication(AppComponent)');
    expect(Node.isCallExpression(bootstrapFn)).toBe(true);
  });

  it('should return undefined if bootstrap function is not found', () => {
    createSourceFile('src/main.ts', '');
    const bootstrapFn = getBootstrapApplicationFn('src/main.ts');

    expect(bootstrapFn).toBeUndefined();
  });
});
