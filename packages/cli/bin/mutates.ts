import { defineCommand, runMain } from 'citty';

import pkg from '../package.json';
import open from '../src/commands/core/open';

export const main = defineCommand({
  meta: {
    name: 'mutates',
    version: pkg.version,
    description: 'AST mutation CLI for AI agents',
  },
  subCommands: {
    open,
    close: () => import('../src/commands/core/close').then((m) => m.default),
    sessions: () => import('../src/commands/core/sessions').then((m) => m.default),
  },
  run() {
    // eslint-disable-next-line no-console
    console.log('Run `mutates --help` to see available commands.');
  },
});

if (require.main === module) {
  runMain(main);
}
