import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

describe('op handler (in-process daemon)', () => {
  let runtimeDir: string;
  let projectRoot: string;
  let daemon: DaemonHandle;
  let sockPath: string;
  let sid: string;
  let filePath: string;

  beforeEach(async () => {
    runtimeDir = mkdtempSync(join(tmpdir(), 'mutates-runtime-'));
    process.env['MUTATES_RUNTIME_DIR'] = runtimeDir;
    projectRoot = mkdtempSync(join(tmpdir(), 'mutates-root-'));
    mkdirSync(join(projectRoot, 'src'));
    filePath = join(projectRoot, 'src/app.ts');
    writeFileSync(filePath, `export {};\n`);
    ({ daemon, sockPath } = await startDaemonAndConnect(projectRoot));
    const client = await makeClient(sockPath);
    try {
      const opened = (await client.call('session.open', { root: projectRoot })) as {
        result: { sessionId: string };
      };
      sid = opened.result.sessionId;
    } finally {
      client.close();
    }
  });

  afterEach(async () => {
    await daemon?.shutdown();
    delete process.env['MUTATES_RUNTIME_DIR'];
    rmSync(runtimeDir, { recursive: true, force: true });
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('dispatches addClasses against the active project', async () => {
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('op', {
        sessionId: sid,
        op: 'addClasses',
        target: { file: filePath },
        data: { name: 'Foo', isExported: true },
      });
      const result = (resp as { result: { ok: boolean; mutated: string[] } }).result;
      expect(result.ok).toBe(true);
      expect(result.mutated).toContain(filePath);

      const session = daemon.manager.list()[0];
      const sf = session.project.getSourceFile(filePath);
      expect(sf!.getFullText()).toContain('class Foo');
    } finally {
      client.close();
    }
  });

  it('rejects an unknown op with NotFound', async () => {
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('op', {
        sessionId: sid,
        op: 'totallyMadeUpOp',
        target: {},
        data: {},
      });
      expect('error' in resp).toBe(true);
      expect((resp as { error: { code: number } }).error.code).toBe(ErrorCode.NotFound);
    } finally {
      client.close();
    }
  });

  it('rejects a missing op name with InvalidInput', async () => {
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('op', { sessionId: sid });
      expect('error' in resp).toBe(true);
      expect((resp as { error: { code: number } }).error.code).toBe(ErrorCode.InvalidInput);
    } finally {
      client.close();
    }
  });

  it('rejects a payload that fails schema validation', async () => {
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('op', {
        sessionId: sid,
        op: 'addClasses',
        // missing target.file (target is empty object) — schema requires it
        target: {},
        data: { name: 'Foo' },
      });
      expect('error' in resp).toBe(true);
      expect((resp as { error: { code: number } }).error.code).toBe(ErrorCode.InvalidInput);
      // On-disk file untouched.
      expect(readFileSync(filePath, 'utf8')).toBe(`export {};\n`);
    } finally {
      client.close();
    }
  });

  it('invalidates refs for mutated files', async () => {
    const session = daemon.manager.list()[0];
    const sf = session.project.getSourceFile(filePath);
    // Mint a ref before the mutation.
    const ref = session.refs.mint(sf!, filePath);

    const client = await makeClient(sockPath);
    try {
      await client.call('op', {
        sessionId: sid,
        op: 'addClasses',
        target: { file: filePath },
        data: { name: 'Bar' },
      });
    } finally {
      client.close();
    }

    expect(() => session.refs.resolve(ref)).toThrow();
  });
});
