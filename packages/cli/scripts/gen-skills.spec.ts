import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { extractDescription, runGen } from './gen-skills';

describe('gen-skills', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'mutates-gen-skills-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('emits SKILLS with the exact markdown bytes verbatim', async () => {
    const srcDir = join(tmp, 'skills');
    mkdirSync(srcDir);
    const md =
      '# fixture skill\n\nFirst paragraph describing the fixture.\nStill the same paragraph.\n\nSecond paragraph (ignored).\n';
    writeFileSync(join(srcDir, 'demo.md'), md);

    const outFile = join(tmp, 'out/skills.ts');
    const { manifest } = runGen(srcDir, outFile);

    // Import the generated module via a dynamic file URL so the test
    // exercises the emitted JS exactly as the CLI would.
    const mod = (await import(/* @vite-ignore */ outFile)) as {
      SKILLS: Record<string, string>;
      MANIFEST: ReadonlyArray<{ name: string; description: string; sizeBytes: number }>;
    };

    expect(mod.SKILLS['demo']).toBe(md);
    expect(mod.MANIFEST).toHaveLength(1);
    expect(mod.MANIFEST[0]!.name).toBe('demo');
    expect(mod.MANIFEST[0]!.description).toBe(
      'First paragraph describing the fixture. Still the same paragraph.',
    );
    expect(mod.MANIFEST[0]!.sizeBytes).toBe(Buffer.byteLength(md, 'utf8'));
    expect(manifest[0]!.sizeBytes).toBe(Buffer.byteLength(md, 'utf8'));

    // And the generated source contains the JSON.stringified content.
    const generated = readFileSync(outFile, 'utf8');
    expect(generated).toContain(JSON.stringify(md));
    expect(generated).toContain('export type SkillName = keyof typeof SKILLS;');
  });

  it('skips non-markdown files and sorts entries by filename', async () => {
    const srcDir = join(tmp, 'skills');
    mkdirSync(srcDir);
    writeFileSync(join(srcDir, 'b.md'), '# b\n\nB para.\n');
    writeFileSync(join(srcDir, 'a.md'), '# a\n\nA para.\n');
    writeFileSync(join(srcDir, 'README.txt'), 'ignored');

    const outFile = join(tmp, 'out/skills.ts');
    const { manifest } = runGen(srcDir, outFile);

    expect(manifest.map((m) => m.name)).toEqual(['a', 'b']);
  });

  it('throws when the source directory has no markdown', () => {
    const srcDir = join(tmp, 'skills');
    mkdirSync(srcDir);
    expect(() => runGen(srcDir, join(tmp, 'out/skills.ts'))).toThrow(/no skill markdown files/);
  });

  it('throws when the source directory does not exist', () => {
    expect(() => runGen(join(tmp, 'missing'), join(tmp, 'out/skills.ts'))).toThrow(
      /source dir does not exist/,
    );
  });

  describe('extractDescription', () => {
    it('returns the first paragraph after the H1', () => {
      expect(extractDescription('# title\n\nHello world.\nMore.\n\nNext.\n')).toBe(
        'Hello world. More.',
      );
    });

    it('falls back to the first non-empty line when no H1 is present', () => {
      expect(extractDescription('Just a line.\n\nNext.\n')).toBe('Just a line.');
    });

    it('returns empty string for empty input', () => {
      expect(extractDescription('')).toBe('');
    });
  });
});
