---
title: '@mutates/core'
nextjs:
  metadata:
    title: '@mutates/core'
    description: How to install and use @mutates/core for TypeScript AST manipulation
---

# @mutates/core

@mutates/core is the foundation package of the Mutates toolset that provides essential functionality for manipulating TypeScript Abstract Syntax Trees (AST). This package serves as the backbone for other specialized packages in the Mutates ecosystem.

## Installation

Install @mutates/core using npm:

```bash
npm install @mutates/core
```

## Core Concepts

The core package provides several key functionalities for AST manipulation:

### Project Management

```typescript
import { createProject, saveProject, resetActiveProject } from '@mutates/core';

// Create a new project
createProject();

// Make modifications...

// Save changes
saveProject();

// Reset the project state
resetActiveProject();
```

### Source File Operations

```typescript
import { createSourceFile } from '@mutates/core';

// Create a new TypeScript file
createSourceFile(
  'example.ts',
  `
  export class Example {
    greeting: string = 'Hello World';
  }
`
);
```

## Main Features

### Class Manipulation

```typescript
import { addClasses, getClasses, editClasses, removeClasses } from '@mutates/core';

// Add a new class
addClasses('path/to/file.ts', {
  name: 'MyClass',
  isExported: true,
  methods: [{
    name: 'myMethod',
    statements: 'return true;'
  }]
});

// Get existing classes
const classes = getClasses({ pattern: 'path/to/file.ts' });

// Edit classes
editClasses(classes, () => ({
  isExported: true,
  name: 'UpdatedClassName'
}));

// Remove classes
removeClasses(classes);
```

### Function Operations

```typescript
import { addFunctions, getFunctions, editFunctions, removeFunctions } from '@mutates/core';

// Add a new function
addFunctions('path/to/file.ts', {
  name: 'myFunction',
  isExported: true,
  statements: 'return "Hello World";'
});

// Get existing functions
const functions = getFunctions({ pattern: 'path/to/file.ts' });

// Edit functions
editFunctions(functions, () => ({
  isAsync: true,
  statements: 'return Promise.resolve("Hello");'
}));

// Remove functions
removeFunctions(functions);
```

### Property Management

```typescript
import { addProperties, getProperties, editProperties, removeProperties } from '@mutates/core';

// Add class properties
addProperties(targetClass, {
  name: 'myProperty',
  type: 'string',
  initializer: '"default value"'
});
```

### Method Operations

```typescript
import { addMethods, getMethods, editMethods, removeMethods } from '@mutates/core';

// Add class methods
addMethods(targetClass, {
  name: 'myMethod',
  parameters: [{
    name: 'param',
    type: 'string'
  }],
  statements: 'console.log(param);'
});
```

### Decorator Management

```typescript
import { addDecorators } from '@mutates/core';

// Add decorators
addDecorators(target, {
  name: 'MyDecorator',
  arguments: ['arg1', 'arg2']
});
```

## Working with Arrays

The package provides utilities for array manipulation:

```typescript
import { pushToArray, removeFromArray, arrayIncludes } from '@mutates/core';

// Add elements to array
pushToArray(arrayExpression, 'newItem');

// Remove elements
removeFromArray(arrayExpression, 'itemToRemove');

// Check if array includes element
const hasItem = arrayIncludes(arrayExpression, 'searchItem');
```

## Best Practices

1. Always create a project before making modifications:
```typescript
createProject();
```

2. Save changes after modifications:
```typescript
saveProject();
```

3. Clean up by resetting the project when done:
```typescript
resetActiveProject();
```

4. Use pattern matching to target specific files:
```typescript
getClasses({ pattern: 'src/**/*.ts' });
```

## Error Handling

The package throws descriptive errors when operations fail. It's recommended to wrap operations in try-catch blocks:

```typescript
try {
  createProject();
  // ... operations
  saveProject();
} catch (error) {
  console.error('Failed to modify source code:', error);
} finally {
  resetActiveProject();
}
```

## Integration with Other Tools

@mutates/core is designed to work seamlessly with other packages in the Mutates ecosystem:

- @mutates/angular for Angular-specific transformations
- @mutates/nx for Nx workspace operations

## Additional Resources

- [Understanding AST](/ast)
- [Advanced Usage](/advanced-usage)
- [Framework Integrations](/framework-integrations)
- [API Reference](https://mutates.katsuba.dev/packages/core)

For more examples and detailed API documentation, visit the [official documentation](https://mutates.katsuba.dev).
