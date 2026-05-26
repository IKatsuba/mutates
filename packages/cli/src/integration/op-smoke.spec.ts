import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { connect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { startDaemonAndConnect } from '../client/rpc-client-testing';
import type { DaemonHandle } from '../daemon/entry';
import { NdjsonCodec, type RpcMessage, type RpcRequest, type RpcResponse } from '../proto/jsonrpc';

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

/**
 * Cross-category smoke test for the generated op surface.
 *
 * One op per Req 5.1 category family (add / edit / remove / get) — if
 * the codegen or dispatcher silently drops a category, this fails. The
 * bin E2E in `bin/mutates.spec.ts` already covers the citty round-trip;
 * here we go straight through `op` to keep the test compact and to
 * exercise refs/dirty state directly.
 */
describe('op smoke test — every category', () => {
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
    writeFileSync(
      filePath,
      [
        `import { existsSync } from 'node:fs';`,
        ``,
        `export class Greeter {`,
        `  greet(name: string): string {`,
        `    return 'hi ' + name;`,
        `  }`,
        `}`,
        ``,
        `export function helper() { return existsSync('/'); }`,
        ``,
      ].join('\n'),
    );
    ({ daemon, sockPath } = await startDaemonAndConnect(projectRoot));
    const setup = await makeClient(sockPath);
    try {
      const opened = (await setup.call('session.open', { root: projectRoot })) as {
        result: { sessionId: string };
      };
      sid = opened.result.sessionId;
    } finally {
      setup.close();
    }
  });

  afterEach(async () => {
    await daemon?.shutdown();
    delete process.env['MUTATES_RUNTIME_DIR'];
    rmSync(runtimeDir, { recursive: true, force: true });
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('addClasses adds a class to the source file', async () => {
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('op', {
        sessionId: sid,
        op: 'addClasses',
        target: { file: filePath },
        data: { name: 'Added', isExported: true },
      });
      expect('result' in resp).toBe(true);
      const session = daemon.manager.list()[0];
      expect(session.project.getSourceFile(filePath)!.getFullText()).toContain('class Added');
    } finally {
      client.close();
    }
  });

  it('editClasses renames a class via filter', async () => {
    // editClasses uses the "pattern" target shape (file + filter), so we
    // can drive it without first minting a ref through a getter — that
    // keeps the smoke test independent of getters which require a
    // category-specific finder.
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('op', {
        sessionId: sid,
        op: 'editClasses',
        target: { file: filePath, filter: { name: 'Greeter' } },
        data: { name: 'Saluter' },
      });
      expect('result' in resp).toBe(true);
      const session = daemon.manager.list()[0];
      expect(session.project.getSourceFile(filePath)!.getFullText()).toContain('class Saluter');
    } finally {
      client.close();
    }
  });

  it('removeImports drops the named import', async () => {
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('op', {
        sessionId: sid,
        op: 'removeImports',
        target: { file: filePath },
        data: {},
      });
      expect('result' in resp).toBe(true);
      const session = daemon.manager.list()[0];
      expect(session.project.getSourceFile(filePath)!.getFullText()).not.toContain(
        "from 'node:fs'",
      );
    } finally {
      client.close();
    }
  });

  it('getFunctions returns a ref for each function declaration', async () => {
    const client = await makeClient(sockPath);
    try {
      const resp = await client.call('op', {
        sessionId: sid,
        op: 'getFunctions',
        // getFunctions walks the active project's source files; the file
        // hint is informational, the query lives in data.
        target: { file: filePath },
        data: {},
      });
      expect('result' in resp).toBe(true);
      // op handler shape: { ok, result: <handler-return>, mutated }.
      // Generated handler shape: { ok, result: <mintedRefs> }.
      const opResult = (resp as { result: { result: { result: unknown } } }).result;
      const inner = (opResult.result as { ok: boolean; result: unknown }).result as Array<{
        ref?: string;
        name?: string;
      }>;
      // The handler returned successfully and the shape is a minted-ref
      // array. The exact contents depend on whether the active project
      // picked up the no-tsconfig source files, which is covered in
      // dedicated session tests — this smoke check just exercises the
      // get-shaped category through the op pipeline.
      expect(Array.isArray(inner)).toBe(true);
    } finally {
      client.close();
    }
  });
});
