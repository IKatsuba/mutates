import { defineCommand, runMain } from 'citty';

import pkg from '../package.json';
import open from '../src/commands/core/open';
import { GENERATED_COMMANDS } from '../src/commands/generated';

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
    snapshot: () => import('../src/commands/core/snapshot').then((m) => m.default),
    find: () => import('../src/commands/core/find').then((m) => m.default),
    diff: () => import('../src/commands/core/diff').then((m) => m.default),
    save: () => import('../src/commands/core/save').then((m) => m.default),
    reload: () => import('../src/commands/core/reload').then((m) => m.default),
    'list-files': () => import('../src/commands/core/list-files').then((m) => m.default),
    ...GENERATED_COMMANDS,
  },
  run() {
    // eslint-disable-next-line no-console
    console.log('Run `mutates --help` to see available commands.');
  },
});

if (require.main === module) {
  runMain(main);
}
