import { UnitTestTree } from '@angular-devkit/schematics/testing';

import { createSourceFile, getClasses, saveProject } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { addBootstrapToNgModule } from './add-bootstrap-to-ng-module';

describe('addBootstrapToModule', () => {
  let host: UnitTestTree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  describe('No bootstrap property', () => {
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
      addBootstrapToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'TestComponent');

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';

@NgModule({
    bootstrap: [TestComponent]
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

    it('should create the bootstrap property', () => {
      addBootstrapToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'TestComponent');
      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';

@NgModule({bootstrap: [TestComponent]})
export class SomeModule {

}`);
    });
  });

  describe('The bootstrap property is exists', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  bootstrap: [CommonComponent]
})
export class SomeModule {

}`,
      );
    });

    it('should add component to bootstrap', () => {
      addBootstrapToNgModule(getClasses('src/main.ts', { name: 'SomeModule' })[0], 'TestComponent');

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  bootstrap: [CommonComponent, TestComponent]
})
export class SomeModule {

}`);
    });
  });
});
