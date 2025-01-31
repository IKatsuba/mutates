---
title: '@mutates/nx'
nextjs:
  metadata:
    title: '@mutates/nx'
    description: Learn how to use Mutates with Nx workspaces
---

# @mutates/nx

The `@mutates/nx` package extends Mutates functionality to work seamlessly with Nx workspaces, providing tools for manipulating Nx project configurations and workspace files.

## Installation

Install both the Nx package and the core package:

```bash
npm install @mutates/nx @mutates/core
```

## Basic Usage

### Project Setup

Initialize an Nx project with Mutates:

```typescript
import { createNxProject } from '@mutates/nx';
import { saveProject } from '@mutates/core';

// Create project with Nx support
createNxProject();

// Make modifications...

// Save changes
saveProject();
```

## Project Configuration

### Modifying Project Configuration

```typescript
import { editProjectConfiguration } from '@mutates/nx';

// Update project configuration
editProjectConfiguration('my-app', {
  targets: {
    build: {
      executor: '@nx/webpack:webpack',
      options: {
        outputPath: 'dist/apps/my-app',
        main: 'apps/my-app/src/main.ts'
      }
    }
  }
});
```

### Adding Dependencies

```typescript
import { addProjectDependencies } from '@mutates/nx';

// Add project dependencies
addProjectDependencies('my-app', {
  dependencies: ['shared-lib'],
  type: 'implicit' // or 'explicit'
});
```

## Workspace Management

### Updating Workspace Configuration

```typescript
import { updateWorkspaceConfig } from '@mutates/nx';

// Update workspace configuration
updateWorkspaceConfig({
  npmScope: 'my-org',
  defaultProject: 'main-app',
  generators: {
    '@nx/angular:application': {
      style: 'scss',
      strict: true
    }
  }
});
```

### Managing Tags

```typescript
import { addProjectTags } from '@mutates/nx';

// Add tags to project
addProjectTags('my-app', ['frontend', 'public-api']);
```

## Library Management

### Creating Libraries

```typescript
import { addLibrary } from '@mutates/nx';

// Add new library
addLibrary({
  name: 'shared-utils',
  directory: 'libs/shared',
  tags: ['utils', 'shared']
});
```

### Modifying Libraries

```typescript
import { editLibrary } from '@mutates/nx';

// Modify library configuration
editLibrary('shared-utils', {
  buildable: true,
  publishable: true
});
```

## Application Management

### Creating Applications

```typescript
import { addApplication } from '@mutates/nx';

// Add new application
addApplication({
  name: 'admin-portal',
  directory: 'apps/admin',
  tags: ['admin', 'frontend']
});
```

### Configuring Applications

```typescript
import { editApplication } from '@mutates/nx';

// Update application configuration
editApplication('admin-portal', {
  strict: true,
  standalone: true
});
```

## Generator Configuration

### Customizing Generators

```typescript
import { updateGeneratorDefaults } from '@mutates/nx';

// Set default generator options
updateGeneratorDefaults('@nx/angular:component', {
  style: 'scss',
  changeDetection: 'OnPush',
  standalone: true
});
```

## Common Use Cases

### Setting Up Module Boundaries

```typescript
import { setupModuleBoundaries } from '@mutates/nx';

// Configure module boundaries
setupModuleBoundaries({
  enforce: [
    {
      sourceTag: 'type:feature',
      onlyDependOnLibsWithTags: ['type:shared', 'type:util']
    },
    {
      sourceTag: 'scope:admin',
      notDependOnLibsWithTags: ['scope:public']
    }
  ]
});
```

### Configuring Build Targets

```typescript
import { updateBuildTarget } from '@mutates/nx';

// Update build configuration
updateBuildTarget('my-app', {
  optimization: true,
  sourceMap: false,
  extractLicenses: true
});
```

## Best Practices

### Pattern Matching

Use specific patterns for different project types:

```typescript
// Libraries
getLibraries({ pattern: 'libs/**/*.ts' });

// Applications
getApplications({ pattern: 'apps/**/*.ts' });
```

### Error Handling

Wrap Nx operations in try-catch:

```typescript
import { createNxProject } from '@mutates/nx';
import { resetActiveProject } from '@mutates/core';

try {
  createNxProject();
  // Your transformations...
} catch (error) {
  console.error('Nx transformation failed:', error);
} finally {
  resetActiveProject();
}
```

## Integration with Other Tools

### Angular Integration

```typescript
import { createNxProject } from '@mutates/nx';
import { addAngularLibrary } from '@mutates/angular';

// Combine Nx and Angular operations
createNxProject();
addAngularLibrary({
  name: 'feature-auth',
  directory: 'libs/features'
});
```

### Testing Setup

```typescript
import { updateTestTarget } from '@mutates/nx';

// Configure test setup
updateTestTarget('my-app', {
  executor: '@nx/jest:jest',
  options: {
    jestConfig: 'apps/my-app/jest.config.ts',
    passWithNoTests: true
  }
});
```

## Next Steps

- Learn about [Advanced Usage](/advanced-usage)
- Explore [Framework Integrations](/framework-integrations)
- Check out the [Core Package Documentation](/core)

## API Reference

For a comprehensive guide on the available APIs and their usage, please refer to the
[official documentation](https://mutates.katsuba.dev/packages/nx)

## Contributing

🤝 Contributions are welcome! If you have any improvements or suggestions, feel free to open an
issue or submit a pull request.

## License

📄 @mutates/nx is licensed under the Apache-2.0 License. See the
[LICENSE](https://github.com/ikatsuba/mutates/blob/main/LICENSE) file for more information.

---

For further assistance or to report issues, please visit our
[GitHub repository](https://github.com/ikatsuba/mutates).
