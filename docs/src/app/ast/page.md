---
title: 'Understanding AST'
nextjs:
  metadata:
    title: 'Understanding AST'
    description: 'Learn about Abstract Syntax Trees and how Mutates uses them'
---

An Abstract Syntax Tree (AST) is a tree representation of the syntactic structure of source code.
Understanding ASTs is crucial for effectively using Mutates to transform TypeScript code.

## What is an AST?

An AST represents code as a hierarchical structure where each node represents a construct in the
source code. For example:

```typescript
// Source Code
const greeting = "Hello, World!";

// AST Structure (simplified)
{
  type: "VariableDeclaration",
  declarations: [{
    type: "VariableDeclarator",
    id: {
      type: "Identifier",
      name: "greeting"
    },
    init: {
      type: "StringLiteral",
      value: "Hello, World!"
    }
  }],
  kind: "const"
}
```

## Common AST Node Types

### Declarations

```typescript
// Class Declaration
class MyClass {}

// Function Declaration
function myFunction() {}

// Variable Declaration
const myVar = 42;
```

### Expressions

```typescript
// Object Literal
const obj = { key: 'value' };

// Array Literal
const arr = [1, 2, 3];

// Function Call
console.log('Hello');
```

### Statements

```typescript
// If Statement
if (condition) {
  // ...
}

// For Loop
for (let i = 0; i < 10; i++) {
  // ...
}
```

## How Mutates Uses ASTs

Mutates provides a high-level API to manipulate TypeScript ASTs without dealing with the raw tree
structure directly.

### Example: Adding a Class

```typescript
import { addClasses } from '@mutates/core';

// High-level API
addClasses('file.ts', {
  name: 'MyClass',
  properties: [{
    name: 'prop',
    type: 'string'
  }]
});

// Equivalent AST manipulation (internal)
{
  type: "ClassDeclaration",
  id: {
    type: "Identifier",
    name: "MyClass"
  },
  body: {
    type: "ClassBody",
    body: [{
      type: "PropertyDefinition",
      key: {
        type: "Identifier",
        name: "prop"
      },
      typeAnnotation: {
        type: "TSTypeAnnotation",
        typeAnnotation: {
          type: "TSStringKeyword"
        }
      }
    }]
  }
}
```

## Common AST Operations

### Finding Nodes

```typescript
import { getClasses } from '@mutates/core';

// Find all classes in TypeScript files
const classes = getClasses({ pattern: '**/*.ts' });
```

### Modifying Nodes

```typescript
import { editClasses } from '@mutates/core';

// Modify class properties
editClasses(classes, (structure) => ({
  ...structure,
  isExported: true,
}));
```

### Adding Nodes

```typescript
import { addMethods } from '@mutates/core';

// Add methods to a class
addMethods(targetClass, {
  name: 'newMethod',
  statements: 'return true;',
});
```

## Best Practices for AST Manipulation

1. **Preserve Semantics**: Ensure your transformations maintain the original code's meaning.

2. **Handle Edge Cases**: Consider different code structures that might exist:

```typescript
// Different ways to declare a class
class A {}
const B = class {};
export class C {}
```

3. **Maintain Code Style**: Mutates preserves formatting and comments by default.

4. **Validate Changes**: Always test your transformations with various code patterns.

## Common Pitfalls

1. **Forgetting Node References**: AST nodes might become invalid after certain operations.

2. **Incorrect Node Types**: Make sure to use the correct node type for transformations.

3. **Missing Parent Context**: Some operations require understanding the node's context.

## Tools for AST Exploration

1. [AST Explorer](https://astexplorer.net/) - Visualize ASTs online
2. [TypeScript AST Viewer](https://ts-ast-viewer.com/) - Specifically for TypeScript

## Further Reading

- [TypeScript Compiler API Documentation](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [ts-morph Documentation](https://ts-morph.com/) (used internally by Mutates)
- [Advanced Usage Guide](/advanced-usage)

## Next Steps

- Learn about [Framework Integrations](/framework-integrations)
- Explore [Advanced Usage](/advanced-usage)
- Check out [Frequently Asked Questions](/frequently-asked-questions)
