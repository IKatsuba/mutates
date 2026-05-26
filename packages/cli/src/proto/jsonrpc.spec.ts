import { Readable } from 'node:stream';

import { ErrorCode, toSymbolic } from './error-codes';
import { NdjsonCodec, RpcError, type RpcMessage } from './jsonrpc';

async function collect(stream: NodeJS.ReadableStream): Promise<unknown[]> {
  const out: unknown[] = [];
  for await (const chunk of stream) out.push(chunk);
  return out;
}

describe('NdjsonCodec', () => {
  it('encodes a frame with a trailing newline', () => {
    const codec = new NdjsonCodec();
    const frame: RpcMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'snapshot',
      params: { sessionId: 's1' },
    };
    const wire = codec.encode(frame);
    expect(wire.endsWith('\n')).toBe(true);
    expect(JSON.parse(wire.slice(0, -1))).toEqual(frame);
  });

  it('round-trips a request through encode → decode', async () => {
    const codec = new NdjsonCodec();
    const frames: RpcMessage[] = [
      { jsonrpc: '2.0', id: 1, method: 'a', params: { x: 1 } },
      { jsonrpc: '2.0', id: 2, result: { ok: true } },
    ];
    const source = Readable.from([frames.map((f) => codec.encode(f)).join('')]);
    const decoded = await collect(source.pipe(codec.decode()));
    expect(decoded).toEqual(frames);
  });

  it('reassembles a frame split across multiple chunks', async () => {
    const codec = new NdjsonCodec();
    const frame: RpcMessage = { jsonrpc: '2.0', id: 9, method: 'm', params: {} };
    const wire = codec.encode(frame);
    const half = Math.floor(wire.length / 2);
    const chunks = [wire.slice(0, half), wire.slice(half)];
    const source = Readable.from(chunks);
    const decoded = await collect(source.pipe(codec.decode()));
    expect(decoded).toEqual([frame]);
  });

  it('decodes multiple frames separated by a single newline', async () => {
    const codec = new NdjsonCodec();
    const a: RpcMessage = { jsonrpc: '2.0', id: 1, method: 'a', params: {} };
    const b: RpcMessage = { jsonrpc: '2.0', id: 2, method: 'b', params: {} };
    const wire = codec.encode(a) + codec.encode(b);
    // chunk on byte boundaries that span both messages
    const chunks = [wire.slice(0, 10), wire.slice(10, 30), wire.slice(30)];
    const source = Readable.from(chunks);
    const decoded = await collect(source.pipe(codec.decode()));
    expect(decoded).toEqual([a, b]);
  });

  it('rejects malformed JSON lines with ParseError', async () => {
    const codec = new NdjsonCodec();
    const source = Readable.from(['not-json\n']);
    await expect(collect(source.pipe(codec.decode()))).rejects.toMatchObject({
      name: 'RpcError',
      code: ErrorCode.ParseError,
    });
  });

  it('rejects unterminated trailing content at flush', async () => {
    const codec = new NdjsonCodec();
    const source = Readable.from(['{"jsonrpc":"2.0","id":1,"method":"x"}']);
    await expect(collect(source.pipe(codec.decode()))).rejects.toMatchObject({
      name: 'RpcError',
      code: ErrorCode.ParseError,
    });
  });

  it('ignores empty lines between frames', async () => {
    const codec = new NdjsonCodec();
    const frame: RpcMessage = { jsonrpc: '2.0', id: 1, method: 'a', params: {} };
    const wire = '\n\n' + codec.encode(frame) + '\n';
    const source = Readable.from([wire]);
    const decoded = await collect(source.pipe(codec.decode()));
    expect(decoded).toEqual([frame]);
  });
});

describe('RpcError', () => {
  it('carries code and data', () => {
    const err = new RpcError(ErrorCode.StaleRef, 'ref @n3 is stale', { ref: '@n3' });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe(ErrorCode.StaleRef);
    expect(err.data).toEqual({ ref: '@n3' });
    expect(err.name).toBe('RpcError');
  });
});

describe('ErrorCode / toSymbolic', () => {
  it('maps known codes to surface names', () => {
    expect(toSymbolic(ErrorCode.StaleRef)).toBe('STALE_REF');
    expect(toSymbolic(ErrorCode.StaleFile)).toBe('STALE_FILE');
    expect(toSymbolic(ErrorCode.MethodNotFound)).toBe('METHOD_NOT_FOUND');
    expect(toSymbolic(ErrorCode.SessionNotFound)).toBe('SESSION_NOT_FOUND');
    expect(toSymbolic(ErrorCode.InvalidParams)).toBe('INVALID_INPUT');
    expect(toSymbolic(ErrorCode.InvalidInput)).toBe('INVALID_INPUT');
  });

  it('falls back to INTERNAL_ERROR for unknown codes', () => {
    expect(toSymbolic(-99999)).toBe('INTERNAL_ERROR');
  });
});
