import { UnitTestTree } from '@angular-devkit/schematics/testing';

import { createSourceFile, getClasses, saveProject } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { addDeclarationToNgModule } from './add-declaration-to-ng-module';

describe('addDeclarationToModule', () => {
  let host: UnitTestTree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  describe('No declaration property', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';

@NgModule({})
export class SomeModule {

}`,
      );
    });

    it('should create the declarations property', () => {
      addDeclarationToNgModule(
        getClasses('src/main.ts', { name: 'SomeModule' })[0],
        'TestComponent',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';

@NgModule({
    declarations: [TestComponent]
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

    it('should create the declarations property', () => {
      addDeclarationToNgModule(
        getClasses('src/main.ts', { name: 'SomeModule' })[0],
        'TestComponent',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';

@NgModule({declarations: [TestComponent]})
export class SomeModule {

}`);
    });
  });

  describe('The declarations property is exists', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [CommonComponent]
})
export class SomeModule {

}`,
      );
    });

    it('should add component to declarations', () => {
      addDeclarationToNgModule(
        getClasses('src/main.ts', { name: 'SomeModule' })[0],
        'TestComponent',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [CommonComponent, TestComponent]
})
export class SomeModule {

}`);
    });
  });
});
