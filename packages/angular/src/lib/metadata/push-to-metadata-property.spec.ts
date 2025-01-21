import { Tree } from '@angular-devkit/schematics';

import { createSourceFile, readFileSync, saveProject } from '@mutates/core';

import { createTestingTree } from '../../testing';
import { getComponents } from '../component';
import { createAngularProject } from '../create-angular-project';
import { pushToMetadataProperty } from './push-to-metadata-property';

describe('pushToMetadataProperty', () => {
  let host: Tree;
  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  it('should add providers to component', () => {
    createSourceFile(
      'src/main.ts',
      `
@Component({}) class AppComponent {}
`,
    );

    pushToMetadataProperty(getComponents().at(0)!, 'providers', ['AppService']);

    saveProject();

    expect(readFileSync('src/main.ts')).matchSnapshot();
  });
});
