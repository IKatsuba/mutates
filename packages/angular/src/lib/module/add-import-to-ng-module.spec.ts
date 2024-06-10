import { UnitTestTree } from '@angular-devkit/schematics/testing';

import { createSourceFile, getClasses, saveProject } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { addImportToNgModule } from './add-import-to-ng-module';

describe('addImportToModule', () => {
  let host: UnitTestTree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  describe('No imports property', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';

@NgModule({})
export class SomeModule {

}`,
      );
    });

    it('should create the imports property', () => {
      addImportToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'TestModule');

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';

@NgModule({
    imports: [TestModule]
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

    it('should create the imports property', () => {
      addImportToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'TestModule');

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';

@NgModule({imports: [TestModule]})
export class SomeModule {

}`);
    });
  });

  describe('The imports property is exists', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [CommonModule]
})
export class SomeModule {

}`,
      );
    });

    it('should add module to imports', () => {
      addImportToNgModule(
        getClasses('src/main.ts', { name: 'SomeModule' })[0],
        'TestModule.forRoot()',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [CommonModule, TestModule.forRoot()]
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
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [CommonModule]
})
export class SomeModule {

}`,
      );
    });

    it('should not add duplicate module to imports', () => {
      addImportToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'CommonModule', {
        unique: true,
      });

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [CommonModule]
})
export class SomeModule {

}`);
    });
  });

  describe('Imports is a const', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';
import { APP_IMPORTS } from './imports.ts';

@NgModule({
  imports: APP_IMPORTS
})
export class SomeModule {

}`,
      );
    });

    it('should wrap const with array and push new provider', () => {
      addImportToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'CommonModule', {
        unique: true,
      });

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { APP_IMPORTS } from './imports.ts';

@NgModule({
  imports: [APP_IMPORTS, CommonModule]
})
export class SomeModule {

}`);
    });
  });

  describe('Package name is specified', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExistingModule } from 'test-package';

@NgModule({
  imports: [CommonModule, ExistingModule]
})
export class SomeModule {

}`,
      );
    });

    it('should add module to imports', () => {
      addImportToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'TestModule');

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExistingModule } from 'test-package';

@NgModule({
  imports: [CommonModule, ExistingModule, TestModule]
})
export class SomeModule {

}`);
    });

    it('should add module to imports when unique is true', () => {
      addImportToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'TestModule', {
        unique: true,
      });
      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExistingModule } from 'test-package';

@NgModule({
  imports: [CommonModule, ExistingModule, TestModule]
})
export class SomeModule {

}`);
    });
  });
});
