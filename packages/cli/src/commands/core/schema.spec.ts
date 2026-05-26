import { runCommand } from 'citty';

import { OP_SCHEMAS } from '../../generated/op-schemas';
import schema from './schema';

/**
 * Capture stdout / stderr during a Promise-returning callback.
 */
async function capture<T>(
  fn: () => Promise<T>,
): Promise<{ stdout: string; stderr: string; value: T }> {
  const originals = {
    stdoutWrite: process.stdout.write.bind(process.stdout),
    stderrWrite: process.stderr.write.bind(process.stderr),
  };
  let stdout = '';
  let stderr = '';
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderr += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stderr.write;
  try {
    const value = await fn();
    return { stdout, stderr, value };
  } finally {
    process.stdout.write = originals.stdoutWrite;
    process.stderr.write = originals.stderrWrite;
  }
}

describe('mutates schema command', () => {
  it('emits a manifest with at least 60 ops covering every required category', async () => {
    const run = await capture(() => runCommand(schema, { rawArgs: [] }));
    const out = JSON.parse(run.stdout.trim()) as {
      ops: Array<{ op: string; category: string; verb: string; schema: Record<string, unknown> }>;
    };
    expect(out.ops.length).toBeGreaterThanOrEqual(60);

    const categories = new Set(out.ops.map((o) => o.category));
    // Req 5.1 categories
    for (const required of [
      'classes',
      'methods',
      'imports',
      'functions',
      'interfaces',
      'enums',
      'variables',
      'decorators',
    ]) {
      expect(categories.has(required)).toBe(true);
    }
  });

  it('emits a JSON Schema with type, properties, required for addClasses', async () => {
    const run = await capture(() => runCommand(schema, { rawArgs: ['--op', 'addClasses'] }));
    const entry = JSON.parse(run.stdout.trim()) as {
      op: string;
      schema: { type: string; properties: Record<string, unknown>; required: string[] };
    };
    expect(entry.op).toBe('addClasses');
    expect(entry.schema.type).toBe('object');
    expect(entry.schema.properties).toBeDefined();
    expect(Array.isArray(entry.schema.required)).toBe(true);
    expect(entry.schema.required).toEqual(expect.arrayContaining(['target', 'data']));
  });

  it('exits non-zero with NOT_FOUND for an unknown op', async () => {
    const originalExitCode = process.exitCode;
    process.exitCode = 0;
    try {
      const run = await capture(() => runCommand(schema, { rawArgs: ['--op', 'totallyMadeUp'] }));
      const err = JSON.parse(run.stderr.trim()) as { code: string };
      expect(err.code).toBe('NOT_FOUND');
      expect(process.exitCode).toBe(3);
    } finally {
      process.exitCode = originalExitCode;
    }
  });

  it('OP_SCHEMAS is in sync with what the command emits', async () => {
    const run = await capture(() => runCommand(schema, { rawArgs: [] }));
    const out = JSON.parse(run.stdout.trim()) as { ops: Array<{ op: string }> };
    expect(out.ops.length).toBe(Object.keys(OP_SCHEMAS).length);
  });
});
