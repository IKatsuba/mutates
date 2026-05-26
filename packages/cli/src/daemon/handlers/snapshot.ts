import { ErrorCode } from '../../proto/error-codes';
import { RpcError } from '../../proto/jsonrpc';
import { snapshotChildren, snapshotFile } from '../../session/snapshot';
import type { Handler } from '../dispatcher';

/**
 * `snapshot` handler.
 *
 * Accepts either `{ target: { file } }` for a top-level walk or
 * `{ target: { ref } }` for a drill-down. `mode` is reserved for future
 * use; the spec calls out `"top" | "drill"` but the target shape is
 * already unambiguous.
 */
export const snapshotHandler: Handler = ({ session }, params) => {
  if (!session) {
    throw new RpcError(ErrorCode.SessionNotFound, 'snapshot: session not found');
  }
  if (params === null || typeof params !== 'object') {
    throw new RpcError(ErrorCode.InvalidParams, 'snapshot: missing params');
  }
  const { target } = params as { target?: { file?: string; ref?: string } };
  if (!target || typeof target !== 'object') {
    throw new RpcError(ErrorCode.InvalidParams, 'snapshot: missing target');
  }
  if (typeof target.file === 'string' && target.file.length > 0) {
    return session.withActiveProject(() => snapshotFile(session, target.file as string));
  }
  if (typeof target.ref === 'string' && target.ref.length > 0) {
    return session.withActiveProject(() => snapshotChildren(session, target.ref as string));
  }
  throw new RpcError(ErrorCode.InvalidParams, 'snapshot: target must provide file or ref');
};
