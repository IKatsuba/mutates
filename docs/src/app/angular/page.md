---
title: '@mutates/angular'
nextjs:
  metadata:
    title: '@mutates/angular'
    description: Learn how to use Mutates with Angular projects
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

Install both the Angular package and the core package:

```bash
npm install @mutates/angular @mutates/core
```

## Basic Usage

### Project Setup

Initialize an Angular project with Mutates:

```typescript
import { createAngularProject } from '@mutates/angular';
import { saveProject } from '@mutates/core';

// Create project with Angular support
createAngularProject();

// Make modifications...

// Save changes
saveProject();
```

### Working with Components

Find and modify Angular components:

```typescript
import { getComponents, editComponents, addProviders } from '@mutates/angular';

// Find components
const components = getComponents({
  pattern: 'src/**/*.component.ts'
});

// Modify components
editComponents(components, () => ({
  changeDetection: 'ChangeDetectionStrategy.OnPush',
  styles: [`
    :host {
      display: block;
    }
  `]
}));

// Add providers
addProviders(components, ['MyService']);
```

### Module Management

Manipulate Angular modules:

```typescript
import { getModules, addImports, addDeclarations } from '@mutates/angular';

const modules = getModules();

// Add imports
addImports(modules, {
  namedImports: ['CommonModule'],
  moduleSpecifier: '@angular/common'
});

// Add declarations
addDeclarations(modules, ['MyComponent']);
```

## Advanced Features

### Standalone Migration

Convert NgModule-based components to standalone:

```typescript
import { migrateToStandalone, getComponents } from '@mutates/angular';

const components = getComponents();
migrateToStandalone(components);
```

### Dependency Injection

Manage dependencies and providers:

```typescript
import { addInjectionToken, editProviders } from '@mutates/angular';

// Add injection token
addInjectionToken('src/app/tokens.ts', {
  name: 'API_URL',
  type: 'string',
  value: '"https://api.example.com"'
});

// Edit providers
editProviders(targetModule, (providers) => [
  ...providers,
  { provide: 'API_URL', useValue: 'https://api.example.com' }
]);
```

### Template Manipulation

Update component templates:

```typescript
import { editComponents } from '@mutates/angular';

editComponents(components, () => ({
  template: `
    <div *ngIf="data$ | async as data">
      {{ data | json }}
    </div>
  `
}));
```

## Common Use Cases

### Adding Angular Material

```typescript
import { addImports, getModules } from '@mutates/angular';

const modules = getModules();

// Add Material modules
addImports(modules, [
  {
    namedImports: ['MatButtonModule'],
    moduleSpecifier: '@angular/material/button'
  },
  {
    namedImports: ['MatInputModule'],
    moduleSpecifier: '@angular/material/input'
  }
]);
```

### Setting Up Routing

```typescript
import { addRoutes, getModules } from '@mutates/angular';

const modules = getModules();

// Add routes
addRoutes(modules, [
  {
    path: 'users',
    component: 'UsersComponent',
    children: [
      {
        path: ':id',
        component: 'UserDetailComponent'
      }
    ]
  }
]);
```

### Adding Services

```typescript
import { addServices } from '@mutates/angular';

// Create new service
addServices('src/app/services', {
  name: 'DataService',
  methods: [
    {
      name: 'getData',
      returnType: 'Observable<any>',
      statements: 'return this.http.get("/api/data");'
    }
  ],
  constructorParameters: [
    {
      name: 'http',
      type: 'HttpClient',
      accessModifier: 'private'
    }
  ]
});
```

## Best Practices

### Pattern Matching

Use specific patterns for different Angular files:

```typescript
// Components
getComponents({ pattern: 'src/**/*.component.ts' });

// Services
getServices({ pattern: 'src/**/*.service.ts' });

// Modules
getModules({ pattern: 'src/**/*.module.ts' });
```

### Error Handling

Wrap Angular operations in try-catch:

```typescript
import { createAngularProject } from '@mutates/angular';
import { resetActiveProject } from '@mutates/core';

try {
  createAngularProject();
  // Your transformations...
} catch (error) {
  console.error('Angular transformation failed:', error);
} finally {
  resetActiveProject();
}
```

### Testing Transformations

Create tests for your transformations:

```typescript
import { createTestingProject } from '@mutates/core/testing';
import { getComponents, addProviders } from '@mutates/angular';

describe('Angular Transformations', () => {
  beforeEach(() => {
    createTestingProject();
  });

  it('should add providers to component', () => {
    // Your test code
  });
});
```

## Integration with Build Tools

### Angular CLI

Use with ng add:

```typescript
import { createAngularProject } from '@mutates/angular';

export function ngAdd(options: any) {
  createAngularProject();
  // Your modifications...
}
```

### Schematics

Create custom schematics:

```typescript
import { Rule } from '@angular-devkit/schematics';
import { createAngularProject } from '@mutates/angular';

export function customSchematic(): Rule {
  return (tree) => {
    createAngularProject(tree);
    // Your transformations...
    return tree;
  };
}
```

## Next Steps

- Learn about [Advanced Usage](/advanced-usage)
- Explore [Framework Integrations](/framework-integrations)
- Check out the [Core Package Documentation](/core)

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
