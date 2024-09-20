---
title: 'Coding Standards'
nextjs:
  metadata:
    title: 'Coding Standards'
    description: 'Learn about the coding standards of `mutates`.'
---

# Coding Standards

Welcome to the coding standards for the `mutates` project. This document outlines the guidelines and
best practices for contributing to the codebase.

## General Guidelines

- **Consistency**: Ensure that your code is consistent with the existing codebase.
- **Readability**: Write code that is easy to read and understand.
- **Documentation**: Document your code where necessary, especially for complex logic.

## Code Style

- **Indentation**: Use 2 spaces for indentation.
- **Line Length**: Limit lines to 100 characters.
- **Quotes**: Use single quotes for strings.
- **Semicolons**: Use semicolons at the end of statements.

## TypeScript Specific

- **Types**: Always define types for function parameters and return values.
- **Interfaces**: Prefer interfaces over type aliases for object shapes.
- **Enums**: Use enums for sets of related constants.

## Example

Here is an example of a well-formatted TypeScript function:

```typescript
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

## Linting and Formatting

We use ESLint and Prettier to enforce code style and formatting. Ensure that your code passes all
linting checks before submitting a pull request.

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit
messages. This helps in automating the release process and generating changelogs.

## Additional Resources

For more detailed guidelines, refer to the following documents:

- [Contribution Guide](/contribution-guide)
- [Frequently Asked Questions](/frequently-asked-questions)
- [Troubleshooting](/troubleshooting)

Thank you for contributing to `mutates`!
