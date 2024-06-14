import { Tree } from '@angular-devkit/schematics';

import { createSourceFile, readFileSync, saveProject } from '@mutates/core';

import { createAngularProject } from '../../create-angular-project';
import { createTestingTree } from '../../testing';
import { addAppProviders } from './add-app-providers';

describe('addAppProviders', () => {
  let host: Tree;
  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  it('should add providers to the app module', () => {
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
      `import {NgModule} from '@angular/core';
    
@NgModule({
  providers: [],
})
export class AppModule {}
`,
    );

    addAppProviders('src/main.ts', ['AppService']);

    saveProject();

    expect(readFileSync('src/app/app.module.ts')).matchSnapshot();
  });

  it('should add providers to the bootstrapApplication function', () => {
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

    addAppProviders('src/main.ts', ['AppService']);

    saveProject();

    expect(readFileSync('src/main.ts')).matchSnapshot();
  });
});
