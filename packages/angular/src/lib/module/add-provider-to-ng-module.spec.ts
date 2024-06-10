import { UnitTestTree } from '@angular-devkit/schematics/testing';

import { createSourceFile, getClasses, saveProject } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { addProviderToNgModule } from './add-provider-to-ng-module';

describe('addProviderToModule', () => {
  let host: UnitTestTree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  describe('No providers property', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';

@NgModule({})
export class SomeModule {

}`,
      );
    });

    it('should create the providers property', () => {
      addProviderToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'TestService');

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';

@NgModule({
    providers: [TestService]
})
export class SomeModule {

}`);
    });
  });

  describe('No decorator arguments', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';

@NgModule()
export class SomeModule {

}`,
      );
    });

    it('should create the providers property', () => {
      addProviderToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'TestService');

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';

@NgModule({providers: [TestService]})
export class SomeModule {

}`);
    });
  });

  describe('The providers property is exists', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  providers: [CommonService]
})
export class SomeModule {

}`,
      );
    });

    it('should add module to providers', () => {
      addProviderToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'TestService');

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  providers: [CommonService, TestService]
})
export class SomeModule {

}`);
    });
  });

  describe('With unique flag', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';
import { CommonService } from '@angular/common';

@NgModule({
  providers: [CommonService]
})
export class SomeModule {

}`,
      );
    });

    it('should not add duplicate module to providers', () => {
      addProviderToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'CommonService', {
        unique: true,
      });

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { CommonService } from '@angular/common';

@NgModule({
  providers: [CommonService]
})
export class SomeModule {

}`);
    });
  });

  describe('Providers is a const', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';
import { APP_PROVIDERS } from './providers.ts';

@NgModule({
  providers: APP_PROVIDERS
})
export class SomeModule {

}`,
      );
    });

    it('should wrap const with array and push new provider', () => {
      addProviderToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'CommonService', {
        unique: true,
      });

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { APP_PROVIDERS } from './providers.ts';

@NgModule({
  providers: [APP_PROVIDERS, CommonService]
})
export class SomeModule {

}`);
    });
  });

  describe('With specified packageName', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';
import { CommonService } from '@angular/common';

@NgModule({
  providers: [CommonService]
})
export class SomeModule {

}`,
      );
    });

    it('should not add service to providers', () => {
      addProviderToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'NewService', {
        unique: true,
      });
      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { CommonService } from '@angular/common';

@NgModule({
  providers: [CommonService, NewService]
})
export class SomeModule {

}`);
    });
  });
});
