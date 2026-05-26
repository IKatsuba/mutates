import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { connect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { startDaemonAndConnect } from '../../client/rpc-client-testing';
import { ErrorCode } from '../../proto/error-codes';
import {
  NdjsonCodec,
  type RpcMessage,
  type RpcRequest,
  type RpcResponse,
} from '../../proto/jsonrpc';
import type { DaemonHandle } from '../entry';

interface TestClient {
  call(method: string, params?: unknown): Promise<RpcResponse>;
  close(): void;
}

function makeClient(sockPath: string): Promise<TestClient> {
  return new Promise((resolve, reject) => {
    const codec = new NdjsonCodec();
    const socket: Socket = connect(sockPath);
    const decoder = codec.decode();
    socket.pipe(decoder);
    let nextId = 1;
    const pending = new Map<RpcRequest['id'], (msg: RpcResponse) => void>();
    decoder.on('data', (msg: RpcMessage) => {
      const id = (msg as RpcResponse).id;
      if (id !== null && pending.has(id)) {
        const fn = pending.get(id)!;
        pending.delete(id);
        fn(msg as RpcResponse);
      }
    });
    socket.once('connect', () => {
      resolve({
        call(method, params) {
          const id = nextId++;
          return new Promise<RpcResponse>((res) => {
            pending.set(id, res);
            socket.write(codec.encode({ jsonrpc: '2.0', id, method, params: params ?? {} }));
          });
        },
        close() {
          socket.destroy();
        },
      });
    });
    socket.once('error', reject);
  });
}

describe('snapshot/find/listFiles handlers (in-process daemon)', () => {
  let runtimeDir: string;
  let projectRoot: string;
  let daemon: DaemonHandle;
  let sockPath: string;

  beforeEach(async () => {
    runtimeDir = mkdtempSync(join(tmpdir(), 'mutates-runtime-'));
    process.env['MUTATES_RUNTIME_DIR'] = runtimeDir;
    projectRoot = mkdtempSync(join(tmpdir(), 'mutates-root-'));
    mkdirSync(join(projectRoot, 'src'));
    writeFileSync(
      join(projectRoot, 'src/app.ts'),
      `import { of } from "rxjs";\nexport class AppService {\n  m() {}\n}\nexport function helper() {}\n`,
    );
    ({ daemon, sockPath } = await startDaemonAndConnect(projectRoot));
  });

  afterEach(async () => {
    await daemon?.shutdown();
    delete process.env['MUTATES_RUNTIME_DIR'];
    rmSync(runtimeDir, { recursive: true, force: true });
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('snapshot returns entries for a file in the session', async () => {
    const client = await makeClient(sockPath);
    try {
      const opened = (await client.call('session.open', { root: projectRoot })) as {
        result: { sessionId: string };
      };
      const sid = opened.result.sessionId;
      const resp = await client.call('snapshot', {
        sessionId: sid,
        target: { file: join(projectRoot, 'src/app.ts') },
      });
      expect('result' in resp).toBe(true);
      const result = (resp as { result: { entries: { ref: string; kind: string }[] } }).result;
      expect(result.entries.map((e) => e.kind)).toEqual(['import', 'class', 'function']);
    } finally {
      client.close();
    }
  });

  it('find returns minted refs that resolve to live nodes', async () => {
    const client = await makeClient(sockPath);
    try {
      const opened = (await client.call('session.open', { root: projectRoot })) as {
        result: { sessionId: string };
      };
      const sid = opened.result.sessionId;
      const resp = await client.call('find', {
        sessionId: sid,
        kind: 'class',
        query: { pattern: join(projectRoot, '**/*.ts') },
      });
      const result = (resp as { result: Array<{ ref: string; name: string }> }).result;
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((r) => r.name === 'AppService')).toBe(true);
    } finally {
      client.close();
    }
  });

  it('listFiles returns the session files with dirty flag', async () => {
    const client = await makeClient(sockPath);
    try {
      const opened = (await client.call('session.open', { root: projectRoot })) as {
        result: { sessionId: string };
      };
      const sid = opened.result.sessionId;
      const resp = await client.call('listFiles', { sessionId: sid });
      const result = (resp as { result: Array<{ file: string; dirty: boolean }> }).result;
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((entry) => entry.dirty === false)).toBe(true);
    } finally {
      client.close();
    }
  });

  it('snapshot on a previously snapshotted file throws StaleRef after invalidate', async () => {
    const client = await makeClient(sockPath);
    try {
      const opened = (await client.call('session.open', { root: projectRoot })) as {
        result: { sessionId: string };
      };
      const sid = opened.result.sessionId;
      const first = (await client.call('snapshot', {
        sessionId: sid,
        target: { file: join(projectRoot, 'src/app.ts') },
      })) as { result: { entries: { ref: string; kind: string }[] } };
      const classEntry = first.result.entries.find((e) => e.kind === 'class');
      expect(classEntry).toBeDefined();
      // Directly invalidate the file in the daemon to simulate a mutation.
      const session = daemon.manager.list()[0];
      session.refs.invalidateFile(join(projectRoot, 'src/app.ts'));
      const resp = await client.call('snapshot', {
        sessionId: sid,
        target: { ref: classEntry!.ref },
      });
      expect('error' in resp).toBe(true);
      expect((resp as { error: { code: number } }).error.code).toBe(ErrorCode.StaleRef);
    } finally {
      client.close();
    }
  });
});
