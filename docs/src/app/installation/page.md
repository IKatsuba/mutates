---
title: Installation
nextjs:
  metadata:
    title: Installation
    description: Learn how to install Mutates packages and get started
---

# Installation Guide

Mutates is distributed as several npm packages, each serving a specific purpose. Here's how to get started with the different packages:

## Core Package

The core package is required for all Mutates functionality:

```bash
npm install @mutates/core
```

## Framework-Specific Packages

### Angular Support

For Angular projects:

```bash
npm install @mutates/angular
```

### Nx Support

For Nx workspaces:

```bash
npm install @mutates/nx
```

## Verifying Installation

You can verify your installation by creating a simple test file:

```typescript
import { createProject } from '@mutates/core';

// This should run without errors
createProject();
```

## System Requirements

- Node.js 14.x or higher
- TypeScript 4.x or higher
- npm 6.x or higher

## Package Versions

It's recommended to use the same version for all @mutates packages in your project to ensure compatibility.

## Next Steps

After installation, you can:

1. Read the [Basic Usage](/basic-usage) guide to get started
2. Explore [Framework Integrations](/framework-integrations)
3. Check out [Advanced Usage](/advanced-usage) for more complex scenarios

## Troubleshooting

If you encounter any installation issues:

1. Clear your npm cache:
   ```bash
   npm cache clean --force
   ```

2. Make sure your Node.js version is compatible:
   ```bash
   node --version
   ```

3. Check for peer dependency conflicts:
   ```bash
   npm ls @mutates/core
   ```

For more help, visit our [GitHub repository](https://github.com/ikatsuba/mutates) or open an issue.
