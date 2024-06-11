import { Tree } from '@angular-devkit/schematics';

import { createSourceFile, getClasses } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing/index';
import { getComponentMetadata } from './get-metadata';

describe('getMetadata', () => {
  let host: Tree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);

    createSourceFile(
      `src/app/app.component.ts`,
      `
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {}
    `,
    );
  });

  it('should return metadata', () => {
    const metadata = getComponentMetadata(getClasses('src/app/**/*.ts'));

    expect(metadata.at(0)?.getText()).toEqual(`{
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
}`);
  });
});
