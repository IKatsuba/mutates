---
title: 'Troubleshooting'
nextjs:
  metadata:
    title: 'Troubleshooting'
    description: 'Common issues and solutions when using Mutates'
---

# Troubleshooting

This guide helps you resolve common issues you might encounter while using Mutates.

## Common Issues

### Project Initialization

#### "Project not initialized" Error

**Problem:**
```typescript
Error: Project not initialized. Call createProject() first.
```

**Solution:**
```typescript
import { createProject } from '@mutates/core';

// Initialize project before any operations
createProject();
```

#### Multiple Project Instances

**Problem:**
```typescript
Error: Another project is already active
```

**Solution:**
```typescript
import { resetActiveProject, createProject } from '@mutates/core';

// Reset any existing project
resetActiveProject();
// Create new project
createProject();
```

### File Operations

#### File Not Found

**Problem:**
```typescript
Error: Could not find source file: "src/example.ts"
```

**Solution:**
```typescript
import { createSourceFile } from '@mutates/core';

// Create file if it doesn't exist
createSourceFile('src/example.ts', '');

// Or check if file exists first
if (!sourceFileExists('src/example.ts')) {
  createSourceFile('src/example.ts', '');
}
```

#### Pattern Matching Issues

**Problem:**
Files not being found with pattern matching.

**Solution:**
```typescript
// ❌ Incorrect
getClasses({ pattern: 'src/*.ts' });

// ✅ Correct - use proper glob pattern
getClasses({ pattern: 'src/**/*.ts' });
```

### AST Manipulation

#### Invalid Node Operations

**Problem:**
```typescript
Error: Cannot perform operation on removed node
```

**Solution:**
```typescript
import { Node } from '@mutates/core';

// Check if node is still valid
if (Node.isSourceFile(node) && !node.isRemoved()) {
  // Perform operations
}
```

#### Type Errors

**Problem:**
```typescript
Error: Type 'string' is not assignable to type 'number'
```

**Solution:**
```typescript
// ❌ Incorrect
addProperties(targetClass, {
  name: 'count',
  type: 'string',
  initializer: '42'
});

// ✅ Correct - match types
addProperties(targetClass, {
  name: 'count',
  type: 'number',
  initializer: '42'
});
```

### Framework Integration

#### Angular Integration Issues

**Problem:**
```typescript
Error: @angular/core not found
```

**Solution:**
```typescript
import { createAngularProject } from '@mutates/angular';

// Ensure Angular dependencies are installed
createAngularProject({
  ensureDependencies: true
});
```

#### Nx Integration Issues

**Problem:**
```typescript
Error: Cannot find workspace configuration
```

**Solution:**
```typescript
import { createNxProject } from '@mutates/nx';

// Specify workspace root
createNxProject({
  workspaceRoot: process.cwd()
});
```

## Performance Issues

### Memory Usage

**Problem:** High memory usage when processing large projects.

**Solution:**
```typescript
// ❌ Avoid loading everything at once
const allFiles = getSourceFiles();

// ✅ Process files in batches
const batchSize = 100;
for (const files of getSourceFilesInBatches(batchSize)) {
  processFiles(files);
}
```

### Slow Operations

**Problem:** Transformations taking too long.

**Solution:**
```typescript
// ❌ Avoid unnecessary operations
getClasses().forEach(processClass);

// ✅ Use specific patterns
getClasses({ pattern: 'src/relevant/**/*.ts' }).forEach(processClass);
```

## Debugging Tips

### Enable Debug Logging

```typescript
import { createProject } from '@mutates/core';

createProject({
  skipFileDependencyResolution: false,
  skipLoadingLibFiles: false
});
```

### Inspect AST Structure

```typescript
import { Node } from '@mutates/core';

function debugNode(node: Node) {
  console.log({
    kind: node.getKindName(),
    text: node.getText(),
    structure: node.getStructure()
  });
}
```

### Check File State

```typescript
import { readFileSync } from '@mutates/core';

// Print file content after transformation
console.log(readFileSync('path/to/file.ts'));
```

## Error Recovery

### Backup Original Files

```typescript
import { createBackup, restoreBackup } from '@mutates/core';

try {
  createBackup();
  // Perform transformations
} catch (error) {
  restoreBackup();
  throw error;
}
```

### Graceful Fallbacks

```typescript
try {
  transformNode(node);
} catch (error) {
  console.warn(`Transformation failed, using fallback: ${error.message}`);
  useFallbackTransformation(node);
}
```

## Best Practices

1. **Always Clean Up**
```typescript
try {
  createProject();
  // Operations...
} finally {
  resetActiveProject();
}
```

2. **Validate Before Transform**
```typescript
if (isValidForTransform(node)) {
  transformNode(node);
} else {
  console.warn('Node not valid for transformation');
}
```

3. **Use Type Guards**
```typescript
import { Node } from '@mutates/core';

if (Node.isClassDeclaration(node)) {
  // Safe to use class-specific operations
}
```

## Getting Help

If you're still experiencing issues:

1. Check the [FAQ](/frequently-asked-questions)
2. Review the [API Documentation](https://mutates.katsuba.dev)
3. [Open an issue](https://github.com/ikatsuba/mutates/issues/new) on GitHub
4. Join our community discussions

## Next Steps

- Read the [Advanced Usage](/advanced-usage) guide
- Learn about [Framework Integrations](/framework-integrations)
- Review [Coding Standards](/coding-standards)
