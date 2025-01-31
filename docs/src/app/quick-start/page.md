---
title: 'Quick Start'
nextjs:
  metadata:
    title: 'Quick Start'
    description: 'Get started quickly with Mutates for TypeScript code transformation'
---

This guide will help you get up and running with Mutates in minutes. You'll learn how to install the
package and perform basic code transformations.

## Installation

1. Install the core package:

```bash
npm install @mutates/core
```

2. Optional: Install framework-specific packages if needed:

```bash
# For Angular projects
npm install @mutates/angular

# For Nx workspaces
npm install @mutates/nx
```

## Basic Example

Here's a simple example that demonstrates the core functionality of Mutates:

```typescript
import { addClasses, createProject, createSourceFile, saveProject } from '@mutates/core';

// Initialize project
createProject();

// Create a new TypeScript file
createSourceFile(
  'src/user.ts',
  `
  // Initial empty file
  `,
);

// Add a class
addClasses('src/user.ts', {
  name: 'User',
  isExported: true,
  properties: [
    {
      name: 'id',
      type: 'number',
    },
    {
      name: 'name',
      type: 'string',
    },
  ],
  methods: [
    {
      name: 'greet',
      returnType: 'string',
      statements: 'return `Hello, ${this.name}!`;',
    },
  ],
});

// Save changes
saveProject();
```

This will generate a file with the following content:

```typescript
export class User {
  id: number;
  name: string;

  greet(): string {
    return `Hello, ${this.name}!`;
  }
}
```

## Common Operations

### Finding and Modifying Classes

```typescript
import { editClasses, getClasses } from '@mutates/core';

// Find classes
const classes = getClasses({ pattern: 'src/**/*.ts' });

// Modify them
editClasses(classes, () => ({
  isExported: true,
  extends: 'BaseClass',
}));
```

### Adding Methods

```typescript
import { addMethods } from '@mutates/core';

addMethods(targetClass, {
  name: 'sayHello',
  parameters: [
    {
      name: 'name',
      type: 'string',
    },
  ],
  statements: 'console.log(`Hello, ${name}!`);',
});
```

### Managing Imports

```typescript
import { addImports } from '@mutates/core';

addImports('src/example.ts', {
  namedImports: ['Injectable'],
  moduleSpecifier: '@angular/core',
});
```

## Framework Integration

### Angular Example

```typescript
import { createAngularProject } from '@mutates/angular';
import { saveProject } from '@mutates/core';

// Initialize Angular project
createAngularProject();

// Add component
addComponent('src/app/features', {
  name: 'UserList',
  template: '<ul><li *ngFor="let user of users">{{user.name}}</li></ul>',
  styles: [
    `
    :host {
      display: block;
      margin: 1rem;
    }
  `,
  ],
});

// Save changes
saveProject();
```

### Nx Example

```typescript
import { saveProject } from '@mutates/core';
import { createNxProject } from '@mutates/nx';

// Initialize Nx project
createNxProject();

// Add library
addLibrary({
  name: 'shared-utils',
  directory: 'libs/shared',
});

// Save changes
saveProject();
```

## Best Practices

1. **Always Initialize Project**

```typescript
import { createProject } from '@mutates/core';

createProject();
```

2. **Use Try-Finally**

```typescript
import { createProject, resetActiveProject } from '@mutates/core';

try {
  createProject();
  // Your transformations...
} finally {
  resetActiveProject();
}
```

3. **Save Changes**

```typescript
import { saveProject } from '@mutates/core';

// After all transformations
saveProject();
```

## Error Handling

```typescript
try {
  createProject();

  // Your transformations...

  saveProject();
} catch (error) {
  console.error('Failed to transform code:', error);
  // Handle error appropriately
} finally {
  resetActiveProject();
}
```

## Next Steps

1. Learn about [Basic Operations](/basic-operations)
2. Explore [Framework Integrations](/framework-integrations)
3. Read the [Advanced Usage](/advanced-usage) guide
4. Check out the [API Documentation](https://mutates.katsuba.dev)

## Getting Help

If you run into any issues:

- Check the [Troubleshooting](/troubleshooting) guide
- Read the [FAQ](/frequently-asked-questions)
- [Open an issue](https://github.com/ikatsuba/mutates/issues/new) on GitHub

## Additional Resources

- [GitHub Repository](https://github.com/ikatsuba/mutates)
- [Example Projects](https://github.com/ikatsuba/mutates/tree/main/examples)
- [API Reference](https://mutates.katsuba.dev)
