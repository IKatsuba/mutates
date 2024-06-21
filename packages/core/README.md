[![](https://raw.githubusercontent.com/IKatsuba/mutates/main/docs/src/app/opengraph-image.png)](https://mutates.katsuba.dev)

# @mutates/core

🔧 **@mutates/core** is the essential package of the Mutates toolset, providing the core
functionality to manipulate the Abstract Syntax Tree (AST) of TypeScript files. It serves as the
backbone for other specialized packages within the Mutates ecosystem.

## Features

- **AST Manipulation:** Modify the AST of any TypeScript file with ease.
- **TypeScript Focused:** Specifically designed for TypeScript, ensuring optimal integration and
  performance.
- **Extensible:** Can be extended with framework-specific packages for additional functionality.

## Installation

To install the core package, use the following command:

```sh
npm install @mutates/core
```

## Usage

### Basic Example

Here is a simple example demonstrating how to use `@mutates/core` to modify a TypeScript file:

```typescript
import { addFunctions, creataProject, createSourceFile, saveProject } from '@mutates/core';

// Initialize a new project
createProject();

// Add a TypeScript file to the project
createSourceFile(
  'example.ts',
  `
  const greet = (name: string) => {
    return 'Hello, ' + name;
  };
`,
);

// Perform some transformations
addFunctions('example.ts', {
  name: 'farewell',
  isExported: true,
  statements: "return 'buy!'",
});

// Save the modified file
saveProject();
```

## API Reference

For a comprehensive guide on the available APIs and their usage, please refer to the
[official documentation](https://mutates.katsuba.dev/packages/core)

## Contributing

🤝 Contributions are welcome! If you have any improvements or suggestions, feel free to open an
issue or submit a pull request.

## License

📄 `@mutates/core` is licensed under the Apache-2.0 License. See the
[LICENSE](https://github.com/ikatsuba/mutates/blob/main/LICENSE) file for more information.

---

For further assistance or to report issues, please visit our
[GitHub repository](https://github.com/ikatsuba/mutates).
