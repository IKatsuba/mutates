import { UnitTestTree } from '@angular-devkit/schematics/testing';

import { createSourceFile, getClasses, saveProject } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { addImportToComponent } from './add-import-to-component';

describe('addProviderToComponent', () => {
  let host: UnitTestTree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  describe('No providers property', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { Component } from '@angular/core';

@Component({})
export class SomeComponent {

}`,
      );
    });

    it('should create the providers property', () => {
      addImportToComponent(
        getClasses('src/main.ts', {
          name: 'SomeComponent',
        })[0],
        'TestImport',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';

@Component({
    imports: [TestImport]
})
export class SomeComponent {

}`);
    });
  });

  describe('No decorator arguments', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { Component } from '@angular/core';

@Component()
export class SomeComponent {

}`,
      );
    });

    it('should create the providers property', () => {
      addImportToComponent(
        getClasses('src/main.ts', {
          name: 'SomeComponent',
        })[0],
        'TestImport',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';

@Component({imports: [TestImport]})
export class SomeComponent {

}`);
    });
  });

  describe('The providers property is exists', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { Component } from '@angular/core';
import { TestImport } from '@angular/common';

@Component({
  imports: [TestImport]
})
export class SomeComponent {

}`,
      );
    });

    it('should add module to providers', () => {
      addImportToComponent(
        getClasses('src/main.ts', {
          name: 'SomeComponent',
        })[0],
        'NewTestImport',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';
import { TestImport } from '@angular/common';

@Component({
  imports: [TestImport, NewTestImport]
})
export class SomeComponent {

}`);
    });
  });
});
