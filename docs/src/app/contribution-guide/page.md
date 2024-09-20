---
title: 'Contribution Guide'
nextjs:
  metadata:
    title: 'Contribution Guide'
    description: How to contribute to the Mutates project.
---

# Contributing to Mutates

We're thrilled that you're interested in contributing to Mutates! This document provides guidelines
and information about how to contribute to our project.

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/mutates.git
   cd mutates
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your contribution:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. Make your changes in the appropriate package(s).
2. Write or update tests for your changes.
3. Ensure all tests pass:
   ```bash
   nx affected --target=test
   ```
4. Update documentation if necessary.
5. Commit your changes with a clear and descriptive commit message.

## Pull Request Process

1. Push your changes to your fork on GitHub.
2. Open a pull request against the `main` branch of the Mutates repository.
3. Ensure your PR description clearly describes the problem and solution.
4. Link any relevant issues in the PR description.
5. Wait for review from maintainers.

## Coding Standards

- Follow the existing code style in the project.
- Use TypeScript for new code.
- Write clear, self-documenting code with appropriate comments where necessary.
- Ensure your code passes linting:
  ```bash
  nx affected --target=lint
  ```

## Testing

- Write unit tests for new functionality.
- Ensure all existing tests pass before submitting a PR.
- Aim for high test coverage for new code.

## Documentation

- Update relevant documentation for any new features or changes.
- Use clear and concise language in documentation.
- Include code examples where appropriate.

## Reporting Issues

- Use the GitHub issue tracker to report bugs or suggest features.
- Clearly describe the issue, including steps to reproduce for bugs.
- Check if the issue has already been reported before creating a new one.

## Community and Conduct

- Be respectful and inclusive in all interactions.
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md).
- Help others in the community when you can.

## Questions?

If you have any questions about contributing, feel free to open an issue for discussion or reach out
to the maintainers directly.

Thank you for contributing to Mutates! Your efforts help make this project better for everyone.
