#!/usr/bin/env node
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
    schema: () => import('../src/commands/core/schema').then((m) => m.default),
    skills: () => import('../src/commands/core/skills').then((m) => m.default),
    ...GENERATED_COMMANDS,
  },
  // Citty (v0.1.x) runs a parent `run()` even after a subcommand handled
  // the call, so anything printed here leaks into stdout on every
  // invocation. We rely on `--help` interception in `runMain` and on
  // citty throwing `E_NO_COMMAND` (which prints usage) when called with
  // no args, so no parent run is needed.
});

if (require.main === module) {
  runMain(main);
}
