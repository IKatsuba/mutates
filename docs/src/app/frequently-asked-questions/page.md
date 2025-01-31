---
title: 'Frequently Asked Questions'
nextjs:
  metadata:
    title: 'Frequently Asked Questions'
    description: 'Common questions and answers about using Mutates'
---

# Frequently Asked Questions

## General Questions

### What is Mutates?
Mutates is a toolkit for programmatically modifying TypeScript source code through AST manipulation. It provides a high-level API for common code transformation tasks.

### How is Mutates different from other code modification tools?
Mutates focuses specifically on TypeScript and provides a type-safe, high-level API. Unlike text-based tools, it understands the structure of your code and can make precise modifications while preserving formatting and comments.

## Installation and Setup

### Why am I getting TypeScript errors after installation?
Ensure you have the correct peer dependencies installed:
```bash
npm install typescript@^4.0.0
```

### Can I use Mutates with JavaScript files?
Yes, Mutates can work with JavaScript files, but it's primarily designed for TypeScript. Some TypeScript-specific features won't be available when working with JavaScript.

## Common Usage Questions

### How do I preserve formatting after modifications?

Mutates automatically preserves formatting in most cases. If you need specific formatting:

```typescript
import { createProject } from '@mutates/core';

createProject({
  manipulationSettings: {
    indentationText: '  ',
    newLineKind: 'lf',
    usePrefixAndSuffixTextForRename: true
  }
});
```

### How do I handle circular dependencies?

When working with files that have circular dependencies:

```typescript
import { createProject } from '@mutates/core';

createProject({
  compilerOptions: {
    allowJs: true,
    allowCircularReferences: true
  }
});
```

### How do I modify multiple files at once?

Use pattern matching to target multiple files:

```typescript
import { getClasses } from '@mutates/core';

const classes = getClasses({
  pattern: ['src/**/*.ts', '!src/**/*.spec.ts']
});
```

## Error Handling

### Why am I getting "Project not initialized" error?

Always create a project before any operations:

```typescript
import { createProject } from '@mutates/core';

createProject();
// ... your code ...
```

### How do I handle syntax errors in source files?

Mutates will throw errors for invalid syntax. Wrap operations in try-catch:

```typescript
try {
  // operations...
} catch (error) {
  if (error.message.includes('Syntax error')) {
    console.error('Invalid syntax in source file:', error);
  }
  throw error;
}
```

## Performance

### How can I improve performance when processing many files?

1. Use batch processing:
```typescript
const batchSize = 100;
for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);
  // Process batch...
}
```

2. Use specific patterns instead of processing all files:
```typescript
getClasses({ pattern: 'src/specific/path/**/*.ts' });
```

### Is there a way to cache results?

Yes, you can implement caching for expensive operations:

```typescript
const cache = new Map();

function getCachedResult(key: string) {
  if (!cache.has(key)) {
    cache.set(key, /* expensive operation */);
  }
  return cache.get(key);
}
```

## Framework Integration

### How do I use Mutates with Angular CLI?

Install the Angular package:
```bash
npm install @mutates/angular
```

Then use Angular-specific features:
```typescript
import { createAngularProject } from '@mutates/angular';

createAngularProject();
```

### Can I use Mutates with Nx?

Yes, install the Nx package:
```bash
npm install @mutates/nx
```

Use Nx-specific features:
```typescript
import { createNxProject } from '@mutates/nx';

createNxProject();
```

## Best Practices

### Should I commit generated files?

Generally, no. Add generated files to `.gitignore`:
```gitignore
# Generated files
*.generated.ts
```

### How do I test my transformations?

Create test files with sample code:

```typescript
import { createTestingProject } from '@mutates/core/testing';

describe('transformations', () => {
  beforeEach(() => {
    createTestingProject();
  });
  
  it('should transform correctly', () => {
    // Your test code
  });
});
```

## Troubleshooting

### Common Issues and Solutions

1. **Files not being found**
   - Check file patterns
   - Ensure paths are relative to project root
   - Verify file extensions

2. **Changes not being saved**
   - Make sure to call `saveProject()`
   - Check write permissions
   - Verify output paths

3. **Unexpected transformations**
   - Use `Node.isXXX()` type guards
   - Check transformation conditions
   - Verify node types before modification

### Debug Tips

1. Print AST structure:
```typescript
console.log(node.getStructure());
```

2. Check node types:
```typescript
console.log(Node.isClassDeclaration(node));
```

3. Enable verbose logging:
```typescript
createProject({
  skipFileDependencyResolution: false,
  skipLoadingLibFiles: false
});
```

## Additional Resources

- [GitHub Issues](https://github.com/ikatsuba/mutates/issues)
- [API Documentation](https://mutates.katsuba.dev)
- [Example Projects](https://github.com/ikatsuba/mutates/tree/main/examples)

Still have questions? Feel free to [open an issue](https://github.com/ikatsuba/mutates/issues/new) on GitHub.
