# @mutates/react

🌟 **@mutates/react** is a specialized package within the Mutates toolset, offering powerful tools to mutate the Abstract Syntax Tree (AST) of React projects. Built on top of `@mutates/core`, this package provides React-specific transformations, making it easier to work with React components, hooks, and more.

[![](https://raw.githubusercontent.com/IKatsuba/mutates/main/docs/src/app/opengraph-image.png)](https://mutates.katsuba.dev)

## Features

- **React-Specific Transformations:** Modify the AST of React components, hooks, and other files.
- **Seamless Integration:** Works in conjunction with `@mutates/core` for a smooth development experience.
- **Efficient:** Designed to handle the unique structure and requirements of React projects.

## Installation

To install the React package, use the following command:

```sh
npm install @mutates/react @mutates/core
```

## Usage

### Basic Example

Here is a simple example demonstrating how to use `@mutates/react` to modify a React component:

```typescript
import { addHooks, getComponents } from '@mutates/react';
import { createProject, createSourceFile, saveProject } from '@mutates/core';

// Initialize a new React project
createProject();

// Add a React component file to the project
createSourceFile(
  'App.tsx',
  `
  import React from 'react';

  const App: React.FC = () => {
    return <h1>Hello, World!</h1>;
  };

  export default App;
`,
);

// Perform some React-specific transformations
addHooks(getComponents('App.tsx').at(0)!, ['useEffect']);

// Save the modified file
saveProject();
```

## API Reference

For a comprehensive guide on the available APIs and their usage, please refer to the [official documentation](https://mutates.katsuba.dev/packages/react)

## Contributing

🤝 Contributions are welcome! If you have any improvements or suggestions, feel free to open an issue or submit a pull request.

## License

📄 @mutates/react is licensed under the Apache-2.0 License. See the [LICENSE](https://github.com/ikatsuba/mutates/blob/main/LICENSE) file for more information.

---

For further assistance or to report issues, please visit our [GitHub repository](https://github.com/ikatsuba/mutates).
