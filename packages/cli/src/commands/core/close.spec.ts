import { runCommand } from 'citty';

import { connectClient } from '../../client/rpc-client';
import close from './close';

vi.mock('../../client/rpc-client', () => ({
  connectClient: vi.fn(),
}));

interface FakeConn {
  call: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

function makeFakeConn(calls: Record<string, unknown>): FakeConn {
  return {
    call: vi.fn(async (method: string) => calls[method] ?? null),
    close: vi.fn(async () => undefined),
  };
}

async function capture<T>(
  fn: () => Promise<T>,
): Promise<{ stdout: string; stderr: string; value: T }> {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  let stdout = '';
  let stderr = '';
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderr += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    return true;
  }) as typeof process.stderr.write;
  try {
    const value = await fn();
    return { stdout, stderr, value };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

describe('mutates close --all', () => {
  beforeEach(() => {
    vi.mocked(connectClient).mockReset();
  });

  it('returns {closed:[], noop:true} JSON when no live sessions exist', async () => {
    const fake = makeFakeConn({ 'session.list': [], 'daemon.shutdown': null });
    vi.mocked(connectClient).mockResolvedValue(fake as never);

    const run = await capture(() =>
      runCommand(close, { rawArgs: ['--all', '--root', '/tmp/none', '--json'] }),
    );
    const payload = JSON.parse(run.stdout.trim());
    expect(payload).toEqual({ closed: [], noop: true });
  });

  it('prints a friendly text message when no live sessions exist', async () => {
    const fake = makeFakeConn({ 'session.list': [], 'daemon.shutdown': null });
    vi.mocked(connectClient).mockResolvedValue(fake as never);

    const run = await capture(() =>
      runCommand(close, { rawArgs: ['--all', '--root', '/tmp/none'] }),
    );
    expect(run.stdout).toContain('no live sessions for /tmp/none');
  });

  it('closes every live session and omits noop when work was done', async () => {
    const fake = makeFakeConn({
      'session.list': [{ id: 'abc' }, { id: 'def' }],
      'session.close': null,
      'daemon.shutdown': null,
    });
    vi.mocked(connectClient).mockResolvedValue(fake as never);

    const run = await capture(() =>
      runCommand(close, { rawArgs: ['--all', '--root', '/tmp/x', '--json'] }),
    );
    const payload = JSON.parse(run.stdout.trim());
    expect(payload.closed).toEqual(['abc', 'def']);
    expect(payload.noop).toBeUndefined();
  });
});
