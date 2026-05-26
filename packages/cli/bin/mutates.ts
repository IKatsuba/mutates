import { defineCommand, runMain } from 'citty';

import pkg from '../package.json';

export const main = defineCommand({
  meta: {
    name: 'mutates',
    version: pkg.version,
    description: 'AST mutation CLI for AI agents',
  },
  subCommands: {},
  run() {
    console.log('Run `mutates --help` to see available commands.');
  },
});

if (require.main === module) {
  runMain(main);
}
