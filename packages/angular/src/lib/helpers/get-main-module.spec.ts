import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { Node } from 'ts-morph';

import { createSourceFile } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { getMainModule } from './get-main-module';

describe('getMainModule', () => {
  let host: UnitTestTree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);

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

    createSourceFile(
      'src/app/app.module.ts',
      `
import {NgModule} from '@angular/core';

@NgModule()
export class AppModule {

}
    `,
    );
  });

  it('should find the AppModule class', () => {
    const classDeclaration = getMainModule('src/main.ts');

    expect(classDeclaration.getText()).toBe(`@NgModule()
export class AppModule {

}`);
    expect(Node.isClassDeclaration(classDeclaration)).toBe(true);
  });
});
