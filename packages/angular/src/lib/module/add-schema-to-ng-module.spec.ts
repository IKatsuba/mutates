import { UnitTestTree } from '@angular-devkit/schematics/testing';

import { createSourceFile, getClasses, saveProject } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { addSchemaToNgModule } from './add-schema-to-ng-module';

describe('addSchemaToModule', () => {
  let host: UnitTestTree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  describe('No schemas property', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';

@NgModule({})
export class SomeModule {

}`,
      );
    });

    it('should create the schemas property', () => {
      addSchemaToNgModule(
        getClasses('src/main.ts', { name: 'SomeModule' })[0],
        'CUSTOM_ELEMENTS_SCHEMA',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';

@NgModule({
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
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

    it('should create the schemas property', () => {
      addSchemaToNgModule(
        getClasses('src/main.ts', { name: 'SomeModule' })[0],
        'CUSTOM_ELEMENTS_SCHEMA',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';

@NgModule({schemas: [CUSTOM_ELEMENTS_SCHEMA]})
export class SomeModule {

}`);
    });
  });

  describe('The schemas property is exists', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  schemas: [NO_ERRORS_SCHEMA]
})
export class SomeModule {

}`,
      );
    });

    it('should add module to schemas', () => {
      addSchemaToNgModule(
        getClasses('src/main.ts', { name: 'SomeModule' })[0],
        'CUSTOM_ELEMENTS_SCHEMA',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class SomeModule {

}`);
    });
  });
});
