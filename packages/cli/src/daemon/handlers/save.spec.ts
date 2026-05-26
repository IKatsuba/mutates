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

describe('diff / save / reload handlers (in-process daemon)', () => {
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
    writeFileSync(filePath, `export class A {}\n`);
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

  it('diff returns an empty unified for an untouched session', async () => {
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('diff', { sessionId: sid });
      const result = (resp as { result: Array<{ file: string; unified: string }> }).result;
      expect(result.every((entry) => entry.unified === '')).toBe(true);
    } finally {
      client.close();
    }
  });

  it('save dry-run does not touch disk', async () => {
    // Mutate in memory by reaching into the session.
    const session = daemon.manager.list()[0];
    const sf = session.project.getSourceFile(filePath);
    sf!.addClass({ name: 'B' });

    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('save', { sessionId: sid, dryRun: true });
      const result = (resp as { result: { wouldWrite: Array<{ file: string; bytes: number }> } })
        .result;
      expect(result.wouldWrite.length).toBeGreaterThan(0);
      expect(result.wouldWrite.some((w) => w.file === filePath)).toBe(true);
      // Disk content unchanged.
      const onDisk = readFileSync(filePath, 'utf8');
      expect(onDisk).toBe(`export class A {}\n`);
    } finally {
      client.close();
    }
  });

  it('save writes dirty files and refreshes fingerprint', async () => {
    const session = daemon.manager.list()[0];
    const sf = session.project.getSourceFile(filePath);
    sf!.addClass({ name: 'B' });

    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('save', { sessionId: sid });
      const result = (resp as { result: { written: string[] } }).result;
      expect(result.written).toContain(filePath);
      const onDisk = readFileSync(filePath, 'utf8');
      expect(onDisk).toContain('class B');
      // After save the session has nothing dirty.
      expect(session.dirtyFiles()).toEqual([]);
    } finally {
      client.close();
    }
  });

  it('save fails with StaleFile when disk diverges concurrently', async () => {
    const session = daemon.manager.list()[0];
    const sf = session.project.getSourceFile(filePath);
    sf!.addClass({ name: 'B' });
    // Simulate a concurrent on-disk change.
    writeFileSync(filePath, `export const NEW = 1;\n`);

    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('save', { sessionId: sid });
      expect('error' in resp).toBe(true);
      expect((resp as { error: { code: number } }).error.code).toBe(ErrorCode.StaleFile);
    } finally {
      client.close();
    }
  });

  it('reload re-reads the file and reports the result', async () => {
    // Change the file on disk externally.
    writeFileSync(filePath, `export class A {}\nexport class C {}\n`);
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('reload', { sessionId: sid, file: filePath });
      const result = (resp as { result: { result: string } }).result;
      expect(['updated', 'noChange']).toContain(result.result);
      const session = daemon.manager.list()[0];
      const text = session.project.getSourceFile(filePath)!.getFullText();
      expect(text).toContain('class C');
    } finally {
      client.close();
    }
  });
});
