import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { formatSnapshot } from '../client/format-snapshot';
import { Session } from './session';
import { snapshotChildren, snapshotFile } from './snapshot';

describe('snapshotFile', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mutates-snap-'));
    mkdirSync(join(root, 'src'));
    writeFileSync(
      join(root, 'src/app.ts'),
      [
        `import { of } from "rxjs";`,
        `export class AppService {`,
        `  method1() {}`,
        `  prop1 = 1;`,
        `}`,
        `export function helper() {}`,
        ``,
      ].join('\n'),
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('returns top-level entries in source order with sequential refs', () => {
    const session = new Session({ root });
    const file = join(root, 'src/app.ts');
    const snap = snapshotFile(session, file);
    expect(snap.entries.map((e) => e.kind)).toEqual(['import', 'class', 'function']);
    expect(snap.entries.map((e) => e.ref)).toEqual(['@n1', '@n2', '@n3']);
  });

  it('captures exported/default modifiers on declarations', () => {
    const session = new Session({ root });
    const snap = snapshotFile(session, join(root, 'src/app.ts'));
    const cls = snap.entries.find((e) => e.kind === 'class');
    expect(cls?.modifiers).toContain('exported');
    expect(cls?.name).toBe('AppService');
  });

  it('reports child counts for classes', () => {
    const session = new Session({ root });
    const snap = snapshotFile(session, join(root, 'src/app.ts'));
    const cls = snap.entries.find((e) => e.kind === 'class');
    expect(cls?.children).toBe(2);
  });

  it('renders human-readable text with the file header', () => {
    const session = new Session({ root });
    const snap = snapshotFile(session, join(root, 'src/app.ts'));
    const text = formatSnapshot(snap);
    expect(text).toContain('File:');
    expect(text).toContain('@n1 [import]');
    expect(text).toContain('@n2 [class] AppService');
    expect(text).toContain('@n3 [function] helper');
  });
});

describe('snapshotChildren', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mutates-snap-children-'));
    mkdirSync(join(root, 'src'));
    writeFileSync(
      join(root, 'src/app.ts'),
      `export class AppService {\n  method1() {}\n  prop1 = 1;\n}\n`,
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('drills into class members', () => {
    const session = new Session({ root });
    const snap = snapshotFile(session, join(root, 'src/app.ts'));
    const cls = snap.entries.find((e) => e.kind === 'class');
    expect(cls).toBeDefined();
    const children = snapshotChildren(session, cls!.ref);
    expect(children.entries.map((e) => e.kind)).toEqual(['method', 'property']);
    expect(children.entries.map((e) => e.name)).toEqual(['method1', 'prop1']);
  });
});
