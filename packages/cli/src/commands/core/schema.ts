import { defineCommand } from 'citty';

import { renderResult } from '../../client/output';
import { OP_SCHEMAS } from '../../generated/op-schemas';
import { CORE_OP_SCHEMAS } from '../../proto/core-op-schemas';

/**
 * `mutates schema` — JSON-schema discovery for every generated op.
 *
 * No-op flag: emits `{ ops: [{ op, category, verb, targetShape, schema }] }`
 * sorted by op name — agents use this as the source-of-truth for
 * payload shapes when calling `mutates op <name>` or the per-op
 * subcommands.
 *
 * With `--op <name>`: emits just that one entry, or exits with
 * `NOT_FOUND` (exit code 3) when the op is unknown.
 *
 * Output is JSON by default since this is a structural query — `--json`
 * is accepted for compatibility but has no effect on the format.
 */
export default defineCommand({
  meta: {
    name: 'schema',
    description: 'Print JSON Schema for every generated op (or just one)',
  },
  args: {
    op: {
      type: 'string',
      description: 'Limit output to a single op (e.g. addClasses)',
    },
    json: {
      type: 'boolean',
      description: 'Emit JSON (default — kept for flag compatibility)',
      default: true,
    },
  },
  run({ args }) {
    if (args.op) {
      const entry = OP_SCHEMAS[args.op] ?? CORE_OP_SCHEMAS[args.op];
      if (!entry) {
        process.stderr.write(
          JSON.stringify({ code: 'NOT_FOUND', message: `unknown op "${args.op}"` }) + '\n',
        );
        process.exitCode = 3;
        return;
      }
      renderResult(entry, 'json');
      return;
    }

    const ops = [...Object.values(OP_SCHEMAS), ...Object.values(CORE_OP_SCHEMAS)].sort((a, b) =>
      a.op.localeCompare(b.op),
    );
    renderResult({ ops }, 'json');
  },
});
