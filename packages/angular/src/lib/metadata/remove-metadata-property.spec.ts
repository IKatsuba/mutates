import { Tree } from '@angular-devkit/schematics';

import { createSourceFile, readFileSync, saveProject } from '@mutates/core';

import { createTestingTree } from '../../testing';
import { getComponents } from '../component';
import { createAngularProject } from '../create-angular-project';
import { removeMetadataProperty } from './remove-metadata-property';

describe('removeMetadataProperty', () => {
  let host: Tree;
  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  it('should remove the providers property', () => {
    createSourceFile(
      'src/main.ts',
      `
@Component({providers: [Set, Map]}) class AppComponent {}
`,
    );

    removeMetadataProperty(getComponents('src/main.ts').at(0)!, 'providers');

    saveProject();

    expect(readFileSync('src/main.ts')).matchSnapshot();
  });
});
