import { stat } from 'node:fs/promises';

import { ErrorCode } from '../../proto/error-codes';
import { RpcError } from '../../proto/jsonrpc';
import type { Handler } from '../dispatcher';

/**
 * `save` handler.
 *
 * Preflight: for every dirty file, verify the FileStatCache says the
 * on-disk state still matches the recorded fingerprint. If any file
 * reports `StaleFile`, throw `RpcError(StaleFile)` with the offending
 * file names — nothing is written.
 *
 * Dry-run path: return `{ wouldWrite: [{ file, bytes }] }`.
 * Real path: write each dirty file via `sourceFile.save()`, refresh the
 * recorded fingerprint, and return `{ written: [...] }`.
 */
export const saveHandler: Handler = async ({ session }, params) => {
  if (!session) {
    throw new RpcError(ErrorCode.SessionNotFound, 'save: session not found');
  }
  const { file, dryRun } = (params ?? {}) as { file?: string; dryRun?: boolean };

  const dirty =
    typeof file === 'string' && file.length > 0
      ? session.dirtyFiles().filter((f) => f === file)
      : session.dirtyFiles();

  // Preflight every dirty file before mutating disk.
  const stale: string[] = [];
  for (const f of dirty) {
    const sf = session.project.getSourceFile(f);
    if (!sf) continue;
    const verify = await session.stats.verify(f, sf.getFullText());
    if (!verify.ok) stale.push(f);
  }
  if (stale.length > 0) {
    throw new RpcError(
      ErrorCode.StaleFile,
      `save: on-disk content diverged for ${stale.join(', ')}`,
      { files: stale },
    );
  }

  if (dryRun) {
    const wouldWrite = dirty.map((f) => {
      const sf = session.project.getSourceFile(f);
      const text = sf?.getFullText() ?? '';
      return { file: f, bytes: Buffer.byteLength(text, 'utf8') };
    });
    return { wouldWrite };
  }

  const written: string[] = [];
  for (const f of dirty) {
    const sf = session.project.getSourceFile(f);
    if (!sf) continue;
    await sf.save();
    try {
      const s = await stat(f);
      session.rebaseline(sf, { mtimeMs: s.mtimeMs, size: s.size });
    } catch {
      // Stat right after save fails — leave the fingerprint stale; the
      // next verify will escalate to a content hash.
    }
    written.push(f);
  }
  return { written };
};
