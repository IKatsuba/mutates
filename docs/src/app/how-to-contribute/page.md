---
title: How to contribute
nextjs:
  metadata:
    title: How to contribute
    description: Learn how to contribute to the Mutates project effectively
---

# How to Contribute

We're excited that you're interested in contributing to Mutates! This guide will help you get started with contributing to the project.

## Getting Started

### Setting Up the Development Environment

1. Fork and clone the repository:
```bash
git clone https://github.com/your-username/mutates.git
cd mutates
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
nx build core
```

### Project Structure

```
mutates/
├── packages/
│   ├── core/          # Core package
│   ├── angular/       # Angular integration
│   └── nx/           # Nx integration
├── docs/             # Documentation
└── examples/         # Example projects
```

## Development Workflow

### Creating a New Feature

1. Create a new branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and write tests:
```typescript
describe('your feature', () => {
  it('should work correctly', () => {
    // Your test code
  });
});
```

3. Run tests:
```bash
nx test core
```

4. Build the project:
```bash
nx build core
```

### Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
# Format
type(scope): description

# Examples
feat(core): add support for generic types
fix(angular): resolve decorator parsing issue
docs: update installation guide
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Testing

### Running Tests

```bash
# Run all tests
nx run-many --target=test --all

# Run specific package tests
nx test core
nx test angular
```

### Writing Tests

1. Create test files with `.spec.ts` extension
2. Use descriptive test names
3. Follow the AAA pattern (Arrange, Act, Assert)

Example:
```typescript
import { createTestingProject } from '@mutates/core/testing';

describe('ClassTransformation', () => {
  beforeEach(() => {
    createTestingProject();
  });

  it('should add method to class', () => {
    // Arrange
    const sourceCode = `class TestClass {}`;
    createSourceFile('test.ts', sourceCode);

    // Act
    addMethods(getClasses()[0], {
      name: 'newMethod',
      statements: 'return true;'
    });

    // Assert
    expect(readFileSync('test.ts')).toContain('newMethod');
  });
});
```

### Running Documentation Locally

```bash
# Start documentation server
nx serve docs
```

## Pull Request Process

1. **Update Documentation**
   - Add/update relevant documentation
   - Include examples if applicable

2. **Write Tests**
   - Add tests for new features
   - Update existing tests if needed

3. **Create Pull Request**
   - Use conventional commit format for PR title
   - Fill out the PR template
   - Link related issues

4. **Code Review**
   - Address review comments
   - Keep discussions focused
   - Be patient and respectful

## Community

### Code of Conduct

We follow our [Code of Conduct](/code-of-conduct). Please read it before contributing.

### Getting Help

- Create an [issue](https://github.com/ikatsuba/mutates/issues) for bugs
- Start a [discussion](https://github.com/ikatsuba/mutates/discussions) for questions
- Join our community chat (coming soon)

### Recognition

Contributors are recognized in several ways:
- Listed in the [Contributors](https://github.com/ikatsuba/mutates/graphs/contributors) section
- Mentioned in release notes for significant contributions
- Featured in our documentation

## Advanced Topics

### Creating New Packages

1. Create package structure:
```bash
nx g @nx/js:library new-package
```

2. Update package configuration:
```json
{
  "name": "@mutates/new-package",
  "version": "0.0.0",
  "peerDependencies": {
    "@mutates/core": "*"
  }
}
```

### Publishing

1. Build the package:
```bash
nx build new-package
```

2. Test the build:
```bash
nx test new-package
```

3. Publish:
```bash
cd dist/packages/new-package
npm publish
```

## Next Steps

- Read our [Coding Standards](/coding-standards)
- Check out [Advanced Usage](/advanced-usage)
- Review [Framework Integrations](/framework-integrations)

Thank you for contributing to Mutates! 🎉
