import { stat } from 'node:fs/promises';

import { ErrorCode } from '../../proto/error-codes';
import { RpcError } from '../../proto/jsonrpc';
import type { Handler } from '../dispatcher';

/**
 * `reload` handler — agent-driven re-read of `file` from disk.
 *
 * Per Req 7.3 this is only invoked when the agent asks; no other
 * handler calls reload implicitly. Maps the ts-morph
 * `FileSystemRefreshResult` enum to the `{ result: "..." }` shape from
 * the design table.
 */
export const reloadHandler: Handler = async ({ session }, params) => {
  if (!session) {
    throw new RpcError(ErrorCode.SessionNotFound, 'reload: session not found');
  }
  const { file } = (params ?? {}) as { file?: string };
  if (typeof file !== 'string' || file.length === 0) {
    throw new RpcError(ErrorCode.InvalidParams, 'reload: missing file');
  }
  const sourceFile = session.project.getSourceFile(file);
  if (!sourceFile) {
    throw new RpcError(ErrorCode.NotFound, `reload: file not in session: ${file}`, { file });
  }

  const result = await sourceFile.refreshFromFileSystem();
  // FileSystemRefreshResult is a numeric enum: 0 NoChange, 1 Updated, 2 Deleted.
  const mapping = ['noChange', 'updated', 'deleted'] as const;
  const symbolic = mapping[result] ?? 'noChange';

  // Invalidate refs into this file and refresh the fingerprint, since
  // the in-memory text may have just been replaced.
  session.refs.invalidateFile(file);
  if (symbolic !== 'deleted') {
    try {
      const s = await stat(file);
      session.rebaseline(sourceFile, { mtimeMs: s.mtimeMs, size: s.size });
    } catch {
      // File may have vanished between refresh and stat — fall through.
    }
  }

  return { result: symbolic };
};
