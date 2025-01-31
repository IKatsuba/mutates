---
title: 'Basic Operations'
nextjs:
  metadata:
    title: 'Basic Operations'
    description: 'Learn about the fundamental operations available in Mutates'
---

# Basic Operations

This guide covers the fundamental operations available in Mutates for manipulating TypeScript code.

## File Operations

### Creating Files

```typescript
import { createSourceFile } from '@mutates/core';

// Create a new TypeScript file
createSourceFile(
  'src/example.ts',
  `
  export class Example {
    message: string = 'Hello World';
  }
  `
);
```

### Reading Files

```typescript
import { readFileSync } from '@mutates/core';

// Read file contents
const content = readFileSync('src/example.ts');
```

## Class Operations

### Adding Classes

```typescript
import { addClasses } from '@mutates/core';

// Add a new class
addClasses('src/models.ts', {
  name: 'User',
  isExported: true,
  properties: [
    {
      name: 'id',
      type: 'number'
    },
    {
      name: 'name',
      type: 'string'
    }
  ]
});
```

### Finding Classes

```typescript
import { getClasses } from '@mutates/core';

// Find all classes
const allClasses = getClasses();

// Find classes by pattern
const modelClasses = getClasses({
  pattern: 'src/models/**/*.ts'
});

// Find classes by name
const userClass = getClasses({
  name: 'User'
});
```

### Modifying Classes

```typescript
import { editClasses } from '@mutates/core';

// Modify classes
editClasses(targetClasses, () => ({
  isExported: true,
  implements: ['Serializable']
}));
```

### Removing Classes

```typescript
import { removeClasses } from '@mutates/core';

// Remove classes
removeClasses(targetClasses);
```

## Method Operations

### Adding Methods

```typescript
import { addMethods } from '@mutates/core';

// Add methods to a class
addMethods(targetClass, {
  name: 'greet',
  parameters: [
    {
      name: 'name',
      type: 'string'
    }
  ],
  returnType: 'string',
  statements: 'return `Hello, ${name}!`;'
});
```

### Finding Methods

```typescript
import { getMethods } from '@mutates/core';

// Get all methods from classes
const methods = getMethods(targetClasses);

// Get specific methods
const getters = getMethods(targetClasses, {
  isGetter: true
});
```

### Modifying Methods

```typescript
import { editMethods } from '@mutates/core';

// Modify methods
editMethods(methods, () => ({
  isAsync: true,
  returnType: 'Promise<string>'
}));
```

## Property Operations

### Adding Properties

```typescript
import { addProperties } from '@mutates/core';

// Add properties to a class
addProperties(targetClass, [
  {
    name: 'count',
    type: 'number',
    initializer: '0'
  },
  {
    name: 'isActive',
    type: 'boolean',
    hasQuestionToken: true
  }
]);
```

### Finding Properties

```typescript
import { getProperties } from '@mutates/core';

// Get all properties
const properties = getProperties(targetClasses);

// Get specific properties
const optionalProps = getProperties(targetClasses, {
  hasQuestionToken: true
});
```

## Decorator Operations

### Adding Decorators

```typescript
import { addDecorators } from '@mutates/core';

// Add decorators to a class
addDecorators(targetClass, {
  name: 'Component',
  arguments: [{
    selector: 'app-root',
    template: '<div>Hello</div>'
  }]
});
```

## Import Operations

### Managing Imports

```typescript
import { addImports } from '@mutates/core';

// Add imports to a file
addImports('src/example.ts', {
  namedImports: ['Component', 'Input'],
  moduleSpecifier: '@angular/core'
});

// Add default import
addImports('src/example.ts', {
  defaultImport: 'React',
  moduleSpecifier: 'react'
});
```

## Export Operations

### Managing Exports

```typescript
import { addExports } from '@mutates/core';

// Add named exports
addExports('src/index.ts', {
  namedExports: ['User', 'Admin'],
  moduleSpecifier: './models'
});

// Add default export
addExports('src/main.ts', {
  defaultExport: 'App'
});
```

## Type Operations

### Adding Interfaces

```typescript
import { addInterfaces } from '@mutates/core';

// Add interface
addInterfaces('src/types.ts', {
  name: 'UserData',
  isExported: true,
  properties: [
    {
      name: 'id',
      type: 'number'
    },
    {
      name: 'profile',
      type: '{
        name: string;
        email: string;
      }'
    }
  ]
});
```

### Adding Type Aliases

```typescript
import { addTypeAliases } from '@mutates/core';

// Add type alias
addTypeAliases('src/types.ts', {
  name: 'UserId',
  type: 'string | number',
  isExported: true
});
```

## Best Practices

1. **Group Related Operations**
```typescript
// Group related transformations
const userClass = getClasses({ name: 'User' })[0];
addProperties(userClass, /* properties */);
addMethods(userClass, /* methods */);
addDecorators(userClass, /* decorators */);
```

2. **Use Pattern Matching Effectively**
```typescript
// Be specific with patterns
const serviceClasses = getClasses({
  pattern: 'src/**/*.service.ts'
});
```

3. **Handle Errors**
```typescript
try {
  // Your operations
} catch (error) {
  console.error('Failed to transform code:', error);
}
```

## Next Steps

- Explore [Advanced Usage](/advanced-usage) for more complex operations
- Learn about [Framework Integrations](/framework-integrations)
- Check out the [FAQ](/frequently-asked-questions) for common questions
