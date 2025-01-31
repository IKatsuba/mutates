---
title: 'Basic Usage'
nextjs:
  metadata:
    title: 'Basic Usage'
    description: 'Learn the fundamental concepts and basic usage of Mutates'
---

# Basic Usage

This guide will walk you through the fundamental concepts and basic usage of Mutates.

## Project Setup

Every Mutates operation starts with creating a project:

```typescript
import { createProject, saveProject } from '@mutates/core';

// Initialize the project
createProject();

// Make your modifications...

// Save changes
saveProject();
```

## Common Operations

### Working with Files

```typescript
import { createSourceFile } from '@mutates/core';

// Create a new file
createSourceFile(
  'src/example.ts',
  `
  export class Example {
    constructor() {}
  }
  `
);
```

### Adding Classes

```typescript
import { addClasses } from '@mutates/core';

addClasses('src/example.ts', {
  name: 'MyService',
  isExported: true,
  properties: [
    {
      name: 'value',
      type: 'string',
      initializer: '"default"'
    }
  ]
});
```

### Modifying Existing Code

```typescript
import { getClasses, editClasses } from '@mutates/core';

// Find classes
const classes = getClasses({ pattern: 'src/**/*.ts' });

// Modify them
editClasses(classes, (structure) => ({
  ...structure,
  isExported: true
}));
```

## Working with Different Elements

### Functions

```typescript
import { addFunctions } from '@mutates/core';

addFunctions('src/utils.ts', {
  name: 'helper',
  parameters: [{ name: 'value', type: 'string' }],
  returnType: 'string',
  statements: 'return value.toUpperCase();'
});
```

### Properties

```typescript
import { addProperties } from '@mutates/core';

addProperties(targetClass, {
  name: 'config',
  type: 'Configuration',
  hasQuestionToken: true
});
```

## Best Practices

1. Always wrap operations in try-catch:
```typescript
try {
  createProject();
  // operations...
  saveProject();
} catch (error) {
  console.error('Error:', error);
}
```

2. Use pattern matching effectively:
```typescript
getClasses({ pattern: 'src/**/*service.ts' });
```

3. Clean up resources:
```typescript
import { resetActiveProject } from '@mutates/core';

try {
  // operations...
} finally {
  resetActiveProject();
}
```

## Next Steps

- Learn about [Advanced Usage](/advanced-usage)
- Explore [Framework Integrations](/framework-integrations)
- Understand [AST Manipulation](/ast)
