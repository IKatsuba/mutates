---
title: '@mutates/angular'
nextjs:
  metadata:
    title: '@mutates/angular'
    description: How to install `@mutates/angular` and get started.
---

# @mutates/angular

🌟 **@mutates/angular** is a specialized package within the Mutates toolset, offering powerful tools
to mutate the Abstract Syntax Tree (AST) of Angular projects. Built on top of `@mutates/core`, this
package provides Angular-specific transformations, making it easier to work with Angular components,
directives, services, and more.

[![](https://raw.githubusercontent.com/IKatsuba/mutates/main/docs/src/app/opengraph-image.png)](https://mutates.katsuba.dev)

## Features

- **Angular-Specific Transformations:** Modify the AST of Angular components, directives, modules,
  and services.
- **Seamless Integration:** Works in conjunction with `@mutates/core` for a smooth development
  experience.
- **Efficient:** Designed to handle the unique structure and requirements of Angular projects.

## Installation

To install the Angular package, use the following command:

```sh
npm install @mutates/angular @mutates/core
```

## Usage

### Basic Example

Here is a simple example demonstrating how to use `@mutates/angular` to modify an Angular component:

```typescript
import { addProviders, getComponents } from '@mutates/angular';
import { createProject, createSourceFile, saveProject } from '@mutates/core';

// Initialize a new Angular project
createProject();

// Add an Angular component file to the project
createSourceFile(
  'app.component.ts',
  `
  import { Component } from '@angular/core';

  @Component({
    selector: 'app-root',
    template: '<h1>Hello, World!</h1>'
  })
  export class AppComponent {}
`,
);

// Perform some Angular-specific transformations
addProviders(getComponents().at(0)!, ['AppService']);

// Save the modified file
saveProject();
```

For schematics and migrations the package provided special function to connect with Angular Tree.
Angular Tree is a special tree that is used to work with Angular projects. It is based on the
`@angular-devkit/schematics` package.

```typescript
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

import { createAngularProject } from '@mutates/angular';
import { saveProject } from '@mutates/core';

export function mySchematic(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // Use Angular Tree to work with Angular projects
    createAngularProject(tree);

    // Perform Angular-specific transformations
    addProviders(getComponents().at(0)!, ['AppService']);

    saveProject();

    return tree;
  };
}
```

## API Reference

For a comprehensive guide on the available APIs and their usage, please refer to the
[official documentation](https://mutates.katsuba.dev/packages/angular)

## Contributing

🤝 Contributions are welcome! If you have any improvements or suggestions, feel free to open an
issue or submit a pull request.

## License

📄 @mutates/angular is licensed under the Apache-2.0 License. See the
[LICENSE](https://github.com/ikatsuba/mutates/blob/main/LICENSE) file for more information.

---

For further assistance or to report issues, please visit our
[GitHub repository](https://github.com/ikatsuba/mutates).
