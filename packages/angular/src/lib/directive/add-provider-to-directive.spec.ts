import { UnitTestTree } from '@angular-devkit/schematics/testing';

import { createSourceFile, getClasses, saveProject } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { addProviderToDirective } from './add-provider-to-directive';

describe('addProviderToDirective', () => {
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

@Directive({})
export class SomeDirective {

}`,
      );
    });

    it('should create the providers property', () => {
      addProviderToDirective(
        getClasses('src/main.ts', {
          name: 'SomeDirective',
        })[0],
        'TestProvider',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';

@Directive({
    providers: [TestProvider]
})
export class SomeDirective {

}`);
    });
  });

  describe('No decorator arguments', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { Component } from '@angular/core';

@Directive()
export class SomeDirective {

}`,
      );
    });

    it('should create the providers property', () => {
      addProviderToDirective(
        getClasses('src/main.ts', {
          name: 'SomeDirective',
        })[0],
        'TestProvider',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';

@Directive({providers: [TestProvider]})
export class SomeDirective {

}`);
    });
  });

  describe('The providers property is exists', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { Component } from '@angular/core';
import { TestService } from 'test-package';

@Directive({
  providers: [TestService]
})
export class SomeDirective {

}`,
      );
    });

    it('should add module to providers', () => {
      addProviderToDirective(
        getClasses('src/main.ts', {
          name: 'SomeDirective',
        })[0],
        'NewTestService',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';
import { TestService } from 'test-package';

@Directive({
  providers: [TestService, NewTestService]
})
export class SomeDirective {

}`);
    });
  });
});
