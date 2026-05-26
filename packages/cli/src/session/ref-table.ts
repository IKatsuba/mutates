import type { Node } from '@mutates/core';

import { ErrorCode } from '../proto/error-codes';
import { RpcError } from '../proto/jsonrpc';

/**
 * Internal storage shape per ref:
 *  - `weak`: a WeakRef to the underlying ts-morph node (so GC can reclaim
 *    forgotten wrappers).
 *  - `file`: absolute path the node lives in.
 *  - `generation`: snapshot of the file's generation counter when the ref
 *    was minted. Must match the file's current generation on resolve.
 */
interface RefRecord {
  weak: WeakRef<Node>;
  file: string;
  generation: number;
  kind: string;
}

/**
 * Mints opaque `@nN` refs that resolve back to live ts-morph nodes.
 *
 * Each file owns its own monotonic id counter (`nextId`) and its own
 * monotonic `generation` counter. Mutating a file (`invalidateFile`)
 * bumps the generation; any ref minted at an older generation resolves
 * as STALE.
 *
 * Per-process; refs are not portable across sessions.
 */
export class RefTable {
  private readonly records = new Map<string, RefRecord>();
  private readonly fileState = new Map<string, { generation: number; nextId: number }>();

  /**
   * Mint a fresh `@nN` ref for `node`. The id is sequential within
   * `file` and is reset by {@link resetFile}.
   */
  mint(node: Node, file: string): string {
    const state = this.ensureFile(file);
    const id = state.nextId++;
    const ref = `@n${id}`;
    this.records.set(ref, {
      weak: new WeakRef(node),
      file,
      generation: state.generation,
      kind: node.getKindName(),
    });
    return ref;
  }

  /**
   * Resolve `ref` back to its live node and originating file. Throws
   * `RpcError(StaleRef)` if the ref is unknown, points into an
   * invalidated generation, or the underlying node was forgotten.
   */
  resolve(ref: string): { node: Node; file: string } {
    const record = this.records.get(ref);
    if (!record) {
      throw new RpcError(ErrorCode.StaleRef, `ref ${ref} is unknown`, { ref });
    }
    const state = this.fileState.get(record.file);
    if (!state || state.generation !== record.generation) {
      throw new RpcError(ErrorCode.StaleRef, `ref ${ref} is stale; re-snapshot ${record.file}`, {
        ref,
        file: record.file,
      });
    }
    const node = record.weak.deref();
    if (!node || node.wasForgotten()) {
      throw new RpcError(ErrorCode.StaleRef, `ref ${ref} is stale; re-snapshot ${record.file}`, {
        ref,
        file: record.file,
      });
    }
    return { node, file: record.file };
  }

  /**
   * Bump the generation for `file`. Every previously minted ref pointing
   * into this file will now fail `resolve` with `StaleRef`. Used after
   * any mutation that may shift node identity.
   */
  invalidateFile(file: string): void {
    const state = this.fileState.get(file);
    if (state) state.generation += 1;
    else this.fileState.set(file, { generation: 1, nextId: 1 });
  }

  /**
   * Reset the id counter and generation for `file` so the next mint
   * starts at `@n1`. Called by the snapshot renderer at the start of a
   * fresh top-level walk.
   */
  resetFile(file: string): void {
    const state = this.fileState.get(file);
    if (state) {
      state.generation += 1;
      state.nextId = 1;
    } else {
      this.fileState.set(file, { generation: 1, nextId: 1 });
    }
  }

  private ensureFile(file: string): { generation: number; nextId: number } {
    let state = this.fileState.get(file);
    if (!state) {
      state = { generation: 1, nextId: 1 };
      this.fileState.set(file, state);
    }
    return state;
  }
}
