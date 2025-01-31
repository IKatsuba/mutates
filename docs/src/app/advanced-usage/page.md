---
title: 'Advanced Usage'
nextjs:
  metadata:
    title: 'Advanced Usage'
    description: 'Learn advanced techniques and patterns for using Mutates effectively'
---

# Advanced Usage

This guide covers advanced techniques and patterns for using Mutates effectively in complex scenarios.

## Complex Transformations

### Chaining Operations

```typescript
import { getClasses, editClasses, addMethods, addProperties } from '@mutates/core';

// Find and transform classes in multiple steps
const classes = getClasses({ pattern: 'src/**/*.ts' });

classes.forEach(klass => {
  // First transformation
  editClasses(klass, () => ({
    isExported: true,
    isAbstract: true
  }));

  // Add methods
  addMethods(klass, {
    name: 'initialize',
    isAbstract: true,
    returnType: 'Promise<void>'
  });

  // Add properties
  addProperties(klass, {
    name: 'isInitialized',
    type: 'boolean',
    initializer: 'false'
  });
});
```

### Conditional Transformations

```typescript
import { getClasses, Node } from '@mutates/core';

const classes = getClasses();

classes.forEach(klass => {
  // Check if class extends a specific base class
  const baseClass = klass.getBaseClass();
  if (baseClass && Node.isIdentifier(baseClass) && baseClass.getText() === 'BaseComponent') {
    // Apply specific transformations for components
  }

  // Check for specific decorators
  const hasInject = klass.getDecorators()
    .some(d => d.getName() === 'Inject');
  if (hasInject) {
    // Apply transformations for injectable classes
  }
});
```

## Working with Types

### Type Management

```typescript
import { addInterfaces, addTypeAliases } from '@mutates/core';

// Add complex interface
addInterfaces('types.ts', {
  name: 'Config',
  properties: [
    {
      name: 'api',
      type: '{
        endpoint: string;
        version: number;
        options?: RequestInit;
      }'
    }
  ]
});

// Add type alias with generic
addTypeAliases('types.ts', {
  name: 'Result',
  typeParameters: ['T'],
  type: '{ data: T; error?: Error }'
});
```

### Generic Type Handling

```typescript
import { addClasses } from '@mutates/core';

addClasses('service.ts', {
  name: 'DataService',
  typeParameters: ['T extends Record<string, any>'],
  properties: [
    {
      name: 'items',
      type: 'T[]'
    }
  ],
  methods: [
    {
      name: 'find',
      typeParameters: ['K extends keyof T'],
      parameters: [
        {
          name: 'key',
          type: 'K'
        },
        {
          name: 'value',
          type: 'T[K]'
        }
      ],
      returnType: 'T | undefined',
      statements: 'return this.items.find(item => item[key] === value);'
    }
  ]
});
```

## Advanced Pattern Matching

### Complex File Patterns

```typescript
import { getClasses } from '@mutates/core';

// Multiple patterns
const classes = getClasses({
  pattern: [
    'src/**/*.service.ts',
    'src/**/*.repository.ts',
    '!src/**/*.spec.ts'
  ]
});

// Pattern with alternatives
const components = getClasses({
  pattern: 'src/**/*.(component|directive).ts'
});
```

### Content-Based Filtering

```typescript
import { getClasses, Node } from '@mutates/core';

// Find classes with specific characteristics
const classes = getClasses().filter(klass => {
  // Has specific method
  const hasMethod = klass.getMethods()
    .some(method => method.getName() === 'ngOnInit');

  // Has specific import
  const hasImport = klass.getSourceFile()
    .getImportDeclarations()
    .some(imp => imp.getModuleSpecifier().getText().includes('@angular/core'));

  return hasMethod && hasImport;
});
```

## Working with Comments and Documentation

### JSDoc Management

```typescript
import { addClasses } from '@mutates/core';

addClasses('service.ts', {
  name: 'ApiService',
  docs: [
    '/**',
    ' * Service for handling API communications',
    ' * @template T - The response data type',
    ' */'
  ],
  methods: [
    {
      name: 'fetch',
      docs: [
        '/**',
        ' * Fetches data from the API',
        ' * @param endpoint - The API endpoint',
        ' * @returns Promise with the response data',
        ' * @throws {ApiError} When the request fails',
        ' */'
      ]
    }
  ]
});
```

### Comment Preservation

```typescript
import { editClasses } from '@mutates/core';

// Preserve existing comments while modifying code
editClasses(targetClass, (structure) => ({
  ...structure,
  methods: structure.methods?.map(method => ({
    ...method,
    // Preserve method documentation
    docs: method.docs
  }))
}));
```

## Performance Optimization

### Batch Processing

```typescript
import { getClasses, editClasses, createProject, saveProject } from '@mutates/core';

// Process files in batches
createProject();

const allClasses = getClasses();
const batchSize = 100;

for (let i = 0; i < allClasses.length; i += batchSize) {
  const batch = allClasses.slice(i, i + batchSize);
  editClasses(batch, /* transformations */);
}

saveProject();
```

### Caching Results

```typescript
import { getClasses, Node } from '@mutates/core';

// Cache complex computations
const classCache = new Map<string, boolean>();

function isEligibleForTransform(klass: Node) {
  const key = klass.getFilePath();
  
  if (classCache.has(key)) {
    return classCache.get(key);
  }

  const isEligible = /* complex computation */;
  classCache.set(key, isEligible);
  
  return isEligible;
}
```

## Error Handling and Validation

### Custom Validation

```typescript
import { getClasses, Node } from '@mutates/core';

function validateClass(klass: Node) {
  const errors = [];

  // Check for required methods
  const requiredMethods = ['initialize', 'dispose'];
  for (const method of requiredMethods) {
    if (!klass.getMethod(method)) {
      errors.push(`Missing required method: ${method}`);
    }
  }

  // Validate property types
  klass.getProperties().forEach(prop => {
    const type = prop.getType();
    if (type.isAny()) {
      errors.push(`Property ${prop.getName()} has 'any' type`);
    }
  });

  return errors;
}

// Use validation in transformations
const classes = getClasses();
classes.forEach(klass => {
  const errors = validateClass(klass);
  if (errors.length > 0) {
    console.error(`Validation failed for ${klass.getName()}:`, errors);
    // Handle errors appropriately
  }
});
```

## Next Steps

- Explore [Framework Integrations](/framework-integrations) for framework-specific advanced usage
- Learn about [AST Manipulation](/ast) for lower-level control
- Check the [FAQ](/frequently-asked-questions) for common advanced scenarios
