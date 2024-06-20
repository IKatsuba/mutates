# @mutates/nx

🚀 **@mutates/nx** is a specialized package within the Mutates toolset, offering robust tools to
mutate the Abstract Syntax Tree (AST) of Nx workspaces. Built on top of `@mutates/core`, this
package provides Nx-specific transformations, making it easier to work with the modular structure of
Nx projects, including Angular, and other framework integrations.

## Features

- **Nx-Specific Transformations:** Modify the AST of Nx workspace files, including project
  configurations, library files, and more.
- **Seamless Integration:** Works in conjunction with `@mutates/core` for a cohesive development
  experience.
- **Versatile:** Supports a variety of frameworks within Nx workspaces, such as Angular.

## Installation

To install the Nx package, use the following command:

```sh
npm install @mutates/nx @mutates/core
```

## Usage

### Basic Example

For generators and migrations, the package provides special functions to connect with Nx Tree. Nx
Tree is a special tree that is used to work with Nx workspaces. It is based on the `@nx/devkit`
package.

```typescript
import { createTree } from '@nx/devkit/testing';

import { readFileSync } from '@mutates/core';
import { createNxProject } from '@mutates/nx';

const tree = createTree();

tree.write('/test.ts', `console.log('Hello, world!');`);

createNxProject(tree);

console.log(readFileSync('/test.ts'));
```

## API Reference

For a comprehensive guide on the available APIs and their usage, please refer to the
[official documentation](https://mutates.katsuba.dev/packages/nx)

## Contributing

🤝 Contributions are welcome! If you have any improvements or suggestions, feel free to open an
issue or submit a pull request.

## License

📄 @mutates/nx is licensed under the Apache-2.0 License. For more information, see the
[LICENSE](https://github.com/ikatsuba/mutates/blob/main/LICENSE) file.

---

For further assistance or to report issues, please visit our
[GitHub repository](https://github.com/ikatsuba/mutates).
