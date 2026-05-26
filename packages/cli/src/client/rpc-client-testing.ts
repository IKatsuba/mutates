import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { startDaemon, type DaemonHandle } from '../daemon/entry';

/**
 * Spin up an in-process daemon listening on a fresh temp socket for use
 * by client integration tests. Returns the daemon handle plus the socket
 * path so callers can clean up.
 *
 * This is test-only; do not export from the public package entrypoint.
 */
export async function startDaemonAndConnect(
  projectRoot: string,
): Promise<{ daemon: DaemonHandle; sockPath: string }> {
  const sockDir = mkdtempSync(join(tmpdir(), 'mutates-sock-'));
  const sockPath = join(sockDir, 'd.sock');
  const daemon = await startDaemon({ root: projectRoot, sock: sockPath });
  return { daemon, sockPath };
}
