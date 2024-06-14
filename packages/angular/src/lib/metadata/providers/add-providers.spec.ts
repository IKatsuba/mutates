import { Tree } from '@angular-devkit/schematics';

import { createSourceFile, readFileSync, saveProject } from '@mutates/core';

import { getComponents } from '../../component';
import { createAngularProject } from '../../create-angular-project';
import { createTestingTree } from '../../testing';
import { addProviders } from './add-providers';

describe('addProviders', () => {
  let host: Tree;
  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  it('should add providers to the app module', () => {
    createSourceFile(
      'src/main.ts',
      `
@Component({}) class AppComponent {}
`,
    );

    addProviders(getComponents('src/main.ts').at(0)!, ['AppService']);

    saveProject();

    expect(readFileSync('src/main.ts')).matchSnapshot();
  });
});
