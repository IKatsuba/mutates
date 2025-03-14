import { Tree } from '@angular-devkit/schematics';

import { createSourceFile, readFileSync, saveProject } from '@mutates/core';

import { createTestingTree } from '../../testing';
import { getComponents } from '../component';
import { createAngularProject } from '../create-angular-project';
import { setMetadataProperty } from './set-metadata-property';

describe('setMetadataProperty', () => {
  let host: Tree;
  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  it('should set providers to the component', () => {
    createSourceFile(
      'src/main.ts',
      `
@Component({providers: [Set, Map]}) class AppComponent {}
`,
    );

    setMetadataProperty(getComponents().at(0)!, 'providers', '[]');

    saveProject();

    expect(readFileSync('src/main.ts')).matchSnapshot();
  });
});
