---
title: 'Framework Integrations'
nextjs:
  metadata:
    title: 'Framework Integrations'
    description: 'Learn how to use Mutates with Angular, Nx, and other frameworks'
---

Mutates provides specialized packages for different frameworks and build tools. This guide explains
how to use Mutates with various frameworks and tools.

## Angular Integration

The `@mutates/angular` package provides specialized tools for Angular projects.

### Installation

```bash
npm install @mutates/angular @mutates/core
```

### Basic Usage

```typescript
import { addProviders, createAngularProject, getComponents } from '@mutates/angular';
import { saveProject } from '@mutates/core';

// Initialize project with Angular support
createAngularProject();

// Find Angular components
const components = getComponents({ pattern: 'src/**/*.component.ts' });

// Add providers to components
addProviders(components, ['MyService']);

saveProject();
```

### Angular-Specific Features

1. **Component Manipulation**

```typescript
import { editComponents } from '@mutates/angular';

editComponents(components, () => ({
  changeDetection: 'ChangeDetectionStrategy.OnPush',
  styles: ['h1 { color: blue; }'],
}));
```

2. **Module Management**

```typescript
import { addImports, getModules } from '@mutates/angular';

const modules = getModules();
addImports(modules, {
  namedImports: ['CommonModule'],
  moduleSpecifier: '@angular/common',
});
```

3. **Service Integration**

```typescript
import { addDecorators } from '@mutates/core';

addDecorators(targetClass, {
  name: 'Injectable',
  arguments: ["{providedIn: 'root'}"],
});
```

## Nx Integration

The `@mutates/nx` package helps with Nx workspace operations.

### Installation

```bash
npm install @mutates/nx @mutates/core
```

### Basic Usage

```typescript
import { saveProject } from '@mutates/core';
import { createNxProject } from '@mutates/nx';

// Initialize Nx project
createNxProject();

// Perform modifications...

saveProject();
```

### Nx-Specific Features

1. **Project Configuration**

```typescript
import { editProjectConfiguration } from '@mutates/nx';

editProjectConfiguration('my-app', {
  targets: {
    build: {
      executor: '@nx/webpack:webpack',
    },
  },
});
```

2. **Workspace Management**

```typescript
import { updateWorkspaceConfig } from '@mutates/nx';

updateWorkspaceConfig({
  npmScope: 'my-org',
  defaultProject: 'main-app',
});
```

## Integration with Build Tools

### Using with TypeScript Compiler

```typescript
import ts from 'typescript';

import { createProject, saveProject } from '@mutates/core';

// Create project with custom compiler options
createProject({
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
  },
});
```

### Using with Webpack

```typescript
// webpack.config.js
const { createProject, saveProject } = require('@mutates/core');

module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              getCustomTransformers: () => ({
                before: [
                  () => {
                    createProject();
                    // Your transformations...
                    saveProject();
                  },
                ],
              }),
            },
          },
        ],
      },
    ],
  },
};
```

## Best Practices

1. **Framework-Specific Patterns**

```typescript
// Angular-specific pattern matching
getComponents({ pattern: 'src/**/*.component.ts' });

// Nx-specific pattern matching
getLibraries({ pattern: 'libs/**/*.ts' });
```

2. **Error Handling**

```typescript
import { createAngularProject, getComponents } from '@mutates/angular';
import { resetActiveProject } from '@mutates/core';

try {
  createAngularProject();
  const components = getComponents();
  // Modifications...
} catch (error) {
  console.error('Failed to modify Angular project:', error);
} finally {
  resetActiveProject();
}
```

3. **Framework Version Compatibility**

```typescript
// Check framework version compatibility
import { isCompatibleWithAngular } from '@mutates/angular';

if (isCompatibleWithAngular()) {
  // Proceed with modifications
}
```

## Common Integration Scenarios

### Migrating Between Frameworks

```typescript
import { migrateToStandalone } from '@mutates/angular';

// Migrate NgModule-based components to standalone
migrateToStandalone(components);
```

### Cross-Framework Operations

```typescript
import { getComponents } from '@mutates/angular';
import { createProject } from '@mutates/core';
import { updateProjectConfig } from '@mutates/nx';

// Combine different framework operations
createProject();
const components = getComponents();
updateProjectConfig(/* ... */);
```

## Next Steps

- Check out [Advanced Usage](/advanced-usage) for more complex scenarios
- Learn about [AST Manipulation](/ast)
- Read the [FAQ](/frequently-asked-questions)
