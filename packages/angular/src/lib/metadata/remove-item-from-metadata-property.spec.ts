import { Tree } from '@angular-devkit/schematics';

import { createSourceFile, readFileSync, saveProject } from '@mutates/core';

import { createTestingTree } from '../../testing';
import { getComponents } from '../component';
import { createAngularProject } from '../create-angular-project';
import { removeItemFromMetadataProperty } from './remove-item-from-metadata-property';

describe('removeItemFromMetadataProperty', () => {
  let host: Tree;
  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  it('should remove providers from component', () => {
    createSourceFile(
      'src/main.ts',
      `
@Component({providers: [AppService]}) class AppComponent {}
`,
    );

    removeItemFromMetadataProperty(getComponents().at(0)!, 'providers', ['AppService']);

    saveProject();

    expect(readFileSync('src/main.ts')).matchSnapshot();
  });
});
