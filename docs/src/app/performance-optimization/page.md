---
title: 'Performance Optimization'
nextjs:
  metadata:
    title: 'Performance Optimization'
    description:
      'Learn how to optimize performance when using Mutates for large-scale code transformations'
---

When working with large codebases or performing complex transformations, it's important to optimize
your Mutates operations for better performance. This guide covers various techniques and best
practices for optimizing performance.

## Memory Management

### Batch Processing

Process large sets of files in smaller batches to reduce memory usage:

```typescript
import { getSourceFiles, processNode } from '@mutates/core';

const batchSize = 100;
const allFiles = getSourceFiles();

// Process files in batches
for (let i = 0; i < allFiles.length; i += batchSize) {
  const batch = allFiles.slice(i, i + batchSize);
  batch.forEach(processNode);

  // Optional: Force garbage collection between batches
  if (global.gc) {
    global.gc();
  }
}
```

### Selective Loading

Only load the files you need:

```typescript
// ❌ Bad: Loading all files
const allFiles = getSourceFiles();

// ✅ Good: Load only relevant files
const serviceFiles = getSourceFiles({
  pattern: 'src/**/*.service.ts',
});
```

## Caching Strategies

### Node Caching

Cache expensive node operations:

```typescript
const nodeCache = new Map<string, Node>();

function getNodeWithCache(id: string): Node {
  if (nodeCache.has(id)) {
    return nodeCache.get(id)!;
  }

  const node = loadNode(id);
  nodeCache.set(id, node);
  return node;
}
```

### Result Caching

Cache transformation results:

```typescript
const transformCache = new Map<string, TransformResult>();

function transformWithCache(node: Node): TransformResult {
  const key = node.getId();

  if (transformCache.has(key)) {
    return transformCache.get(key)!;
  }

  const result = performTransformation(node);
  transformCache.set(key, result);
  return result;
}
```

## Pattern Matching Optimization

### Efficient Patterns

Use specific patterns to reduce the search space:

```typescript
// ❌ Bad: Too broad
getClasses({ pattern: '**/*.ts' });

// ✅ Good: More specific
getClasses({ pattern: 'src/features/**/*.component.ts' });
```

### Pattern Caching

Cache pattern matching results:

```typescript
const patternCache = new Map<string, Node[]>();

function findNodesWithCache(pattern: string): Node[] {
  if (patternCache.has(pattern)) {
    return patternCache.get(pattern)!;
  }

  const nodes = findNodes(pattern);
  patternCache.set(pattern, nodes);
  return nodes;
}
```

## Project Configuration

### Optimized Project Settings

Configure project for better performance:

```typescript
import { createProject } from '@mutates/core';

createProject({
  skipFileDependencyResolution: true,
  skipLoadingLibFiles: true,
  useInMemoryFileSystem: true,
});
```

### Minimal Dependencies

Only load necessary dependencies:

```typescript
createProject({
  compilerOptions: {
    types: ['node'], // Only include required types
    skipLibCheck: true,
  },
});
```

## Parallel Processing

### Worker Threads

Use worker threads for parallel processing:

```typescript
import { Worker } from 'worker_threads';

async function processInParallel(files: string[]) {
  const workerCount = 4;
  const batchSize = Math.ceil(files.length / workerCount);

  const workers = Array.from({ length: workerCount }, (_, i) => {
    const start = i * batchSize;
    const end = start + batchSize;
    const batch = files.slice(start, end);

    return new Promise((resolve) => {
      const worker = new Worker('./transform.worker.js', {
        workerData: { files: batch },
      });
      worker.on('message', resolve);
    });
  });

  return Promise.all(workers);
}
```

## Monitoring and Profiling

### Performance Monitoring

Track performance metrics:

```typescript
class PerformanceMonitor {
  private startTime: number;
  private metrics: Map<string, number> = new Map();

  start(operation: string) {
    this.startTime = performance.now();
  }

  end(operation: string) {
    const duration = performance.now() - this.startTime;
    this.metrics.set(operation, duration);
  }

  report() {
    console.table(Object.fromEntries(this.metrics));
  }
}
```

### Memory Usage Tracking

Monitor memory consumption:

```typescript
function logMemoryUsage() {
  const used = process.memoryUsage();
  console.log({
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
  });
}
```

## Best Practices

1. **Clean Up Resources**

```typescript
try {
  // Operations...
} finally {
  resetActiveProject();
  clearCache();
}
```

2. **Lazy Loading**

```typescript
// Load transformations only when needed
const transformations = new Map<string, () => Transformation>();

function getTransformation(type: string) {
  if (!transformations.has(type)) {
    transformations.set(type, loadTransformation(type));
  }
  return transformations.get(type)!();
}
```

3. **Incremental Processing**

```typescript
function processIncrementally(nodes: Node[]) {
  let processed = 0;
  const total = nodes.length;

  return {
    next() {
      if (processed < total) {
        processNode(nodes[processed++]);
        return { done: false, value: processed / total };
      }
      return { done: true, value: 1 };
    },
  };
}
```

## Common Pitfalls

1. **Memory Leaks**

- Always clean up resources
- Monitor memory usage
- Use weak references when appropriate

2. **Unnecessary Operations**

- Avoid redundant transformations
- Cache expensive computations
- Use selective loading

3. **Synchronous Bottlenecks**

- Use async operations when possible
- Implement parallel processing
- Break up large operations

## Next Steps

- Review [Advanced Usage](/advanced-usage) for more complex scenarios
- Check [Troubleshooting](/troubleshooting) for common issues
- Explore [Framework Integrations](/framework-integrations)
