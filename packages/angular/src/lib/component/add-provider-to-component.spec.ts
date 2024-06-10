import { UnitTestTree } from '@angular-devkit/schematics/testing';

import { createSourceFile, getClasses, saveProject } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { addProviderToComponent } from './add-provider-to-component';

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
      addProviderToComponent(
        getClasses('src/main.ts', {
          name: 'SomeComponent',
        })[0],
        'TestProvider',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';

@Component({
    providers: [TestProvider]
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
      addProviderToComponent(
        getClasses('src/main.ts', {
          name: 'SomeComponent',
        })[0],
        'TestProvider',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';

@Component({providers: [TestProvider]})
export class SomeComponent {

}`);
    });
  });

  describe('The providers property is exists', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { Component } from '@angular/core';
import { TestProvider } from '@angular/common';

@Component({
  providers: [TestProvider]
})
export class SomeComponent {

}`,
      );
    });

    it('should add module to providers', () => {
      addProviderToComponent(
        getClasses('src/main.ts', {
          name: 'SomeComponent',
        })[0],
        'NewTestProvider',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';
import { TestProvider } from '@angular/common';

@Component({
  providers: [TestProvider, NewTestProvider]
})
export class SomeComponent {

}`);
    });
  });
});
