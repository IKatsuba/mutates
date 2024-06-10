import { UnitTestTree } from '@angular-devkit/schematics/testing';

import { createSourceFile, getClasses, saveProject } from '@mutates/core';

import { createAngularProject } from '../create-angular-project';
import { createTestingTree } from '../testing';
import { addStyleUrlToComponent } from './add-style-url-to-component';

describe('addStyleUrlToComponent', () => {
  let host: UnitTestTree;

  beforeEach(() => {
    host = createTestingTree();

    createAngularProject(host);
  });

  describe('No styleUrl property', () => {
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
      addStyleUrlToComponent(
        getClasses('src/main.ts', {
          name: 'SomeComponent',
        })[0],
        '"./style.less"',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';

@Component({
    styleUrls: ["./style.less"]
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
      addStyleUrlToComponent(
        getClasses('src/main.ts', {
          name: 'SomeComponent',
        })[0],
        '"./style.less"',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';

@Component({styleUrls: ["./style.less"]})
export class SomeComponent {

}`);
    });
  });

  describe('The providers property is exists', () => {
    beforeEach(() => {
      createSourceFile(
        'src/main.ts',
        `import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  styleUrls: ["./style.less"]
})
export class SomeComponent {

}`,
      );
    });

    it('should add module to providers', () => {
      addStyleUrlToComponent(
        getClasses('src/main.ts', {
          name: 'SomeComponent',
        })[0],
        '"./new-style.less"',
      );

      saveProject();

      expect(host.readContent('src/main.ts')).toBe(`import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  styleUrls: ["./style.less", "./new-style.less"]
})
export class SomeComponent {

}`);
    });
  });
});
