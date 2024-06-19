---
title: Get Started
description: 'Welcome to the Mutates documentation!'
---

`Mutates` is a fork of [ng-morph](https://github.com/taiga-family/ng-morph) that is focused on
mutating the AST of Angular components.

The biggest difference is that this fork is not focused on Angular specific transformations.
`Mutates` is a set of tools that can be used to mutate the AST of any TypeScript file.

All framework-specific transformations have been moved to separate packages (e.g.
`@mutates/angular`).

The main package is `@mutates/core` which provides the core functionality for mutating the AST of
TypeScript files.

## First steps

To get started, you can install the core package:

```bash
npm install @mutates/core -D
```

Then, you can use the core functionality to mutate the AST of any TypeScript file.

```javascript index.js
import { addSourceFiles, createProject, getClasses } from '@mutates/core';

createProject();

addSourceFiles(['src/**/*.ts']);

const componentCount = getClasses('**/*.ts').length;

console.log(`Found ${componentCount} components.`);
```

`createProject` by default create project which works with real file system. If you want to change
this behavior you can pass FileSystemHost implementation to `createProject` function. For example
you can use `InMemoryFileSystemHost` from `ts-morph` package. Inside project we use it to test our
transformations.

```javascript index.js
import { InMemoryFileSystemHost } from 'ts-morph';

import { createProject, createSourceFile, getClasses } from '@mutates/core';

createProject(new InMemoryFileSystemHost());

createSourceFile('src/index.ts', 'export class Test {}');

const componentCount = getClasses('**/*.ts').length;

console.log(`Found ${componentCount} components.`);
```

To support Angular schematics and migrations we have `@mutates/angular` package. It provides
`createAngularProject` function which creates project with Angular specific configuration.

```javascript index.js
import { createAngularProject, getComponents } from '@mutates/angular';
import { Tree } from '@angular-devkit/schematics';

export function ngAdd(options: scssScaffoldOptions): Rule {
  return (host: Tree) => {
    createAngularProject(host);

    const components = getComponents('**/*.ts');

    console.log(`Found ${components.length} components.`);

    return host;
  }
}
```
