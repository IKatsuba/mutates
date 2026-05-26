import { defineCommand } from 'citty';

import { renderResult } from '../../client/output';
import { MANIFEST, SKILLS, type SkillName } from '../../generated/skills';

/**
 * `mutates skills list` — print the embedded skill manifest as JSON.
 *
 * Each entry has `{ name, description, sizeBytes }`. The list is what
 * an agent uses to decide which skill to fetch; the actual markdown
 * content is retrieved via `mutates skills get <name>`.
 */
const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List embedded skills as JSON',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Emit JSON (default — kept for flag compatibility)',
      default: true,
    },
  },
  run() {
    renderResult(MANIFEST as unknown, 'json');
  },
});

/**
 * `mutates skills get <name>` — print the raw markdown content of an
 * embedded skill. Output goes to stdout exactly as embedded by the
 * `gen-skills` codegen (no trimming, no re-encoding), so an agent
 * receives the same bytes baked in at build time.
 *
 * An unknown name exits with code 3 (`NOT_FOUND`) and writes a
 * symbolic error envelope `{ code, message }` to stderr, matching
 * the contract used by `mutates schema --op <name>`.
 */
const get = defineCommand({
  meta: {
    name: 'get',
    description: 'Print the markdown content of an embedded skill',
  },
  args: {
    name: {
      type: 'positional',
      required: true,
      description: 'Skill name (see `mutates skills list`)',
    },
  },
  run({ args }) {
    const name = args.name as string;
    if (!Object.prototype.hasOwnProperty.call(SKILLS, name)) {
      process.stderr.write(
        JSON.stringify({ code: 'NOT_FOUND', message: `unknown skill "${name}"` }) + '\n',
      );
      process.exitCode = 3;
      return;
    }
    const content = SKILLS[name as SkillName];
    process.stdout.write(content);
  },
});

export default defineCommand({
  meta: {
    name: 'skills',
    description: 'Inspect markdown skills embedded in the bin',
  },
  subCommands: {
    list,
    get,
  },
});
