import { Tree } from '@angular-devkit/schematics';

import { createSourceFile } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { getNgModule } from '../module';
import { createTestingTree } from '../testing';
import { getMetadataProperty } from './get-metadata-property';

describe('getMetadataProperty', () => {
  let host: Tree;
  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  it('should get metadata property', () => {
    createSourceFile(
      'src/main.ts',
      `
@NgModule({providers: []}) class AppModule {}
    `,
    );
    const metadataProperty = getMetadataProperty(getNgModule('src/main.ts').at(0)!, 'providers');

    expect(metadataProperty?.getText()).matchSnapshot();
  });
});
