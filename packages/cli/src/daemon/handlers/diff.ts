import { readFile } from 'node:fs/promises';
import { createPatch } from 'diff';

import { ErrorCode } from '../../proto/error-codes';
import { RpcError } from '../../proto/jsonrpc';
import type { Handler } from '../dispatcher';

/**
 * `diff` handler — return unified diff strings for each tracked file
 * comparing the daemon's in-memory text against disk. With `file`
 * provided, only that file is diffed.
 */
export const diffHandler: Handler = async ({ session }, params) => {
  if (!session) {
    throw new RpcError(ErrorCode.SessionNotFound, 'diff: session not found');
  }
  const { file } = (params ?? {}) as { file?: string };
  const targets = file ? [file] : session.project.getSourceFiles().map((sf) => sf.getFilePath());

  const out: Array<{ file: string; unified: string }> = [];
  for (const f of targets) {
    const sf = session.project.getSourceFile(f);
    if (!sf) continue;
    const inMemory = sf.getFullText();
    let onDisk = '';
    try {
      onDisk = await readFile(f, 'utf8');
    } catch {
      onDisk = '';
    }
    if (inMemory === onDisk) {
      out.push({ file: f, unified: '' });
      continue;
    }
    const unified = createPatch(f, onDisk, inMemory, 'on-disk', 'in-memory');
    out.push({ file: f, unified });
  }
  return out;
};
