/* eslint-disable no-console */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const CLI_ROOT = resolve(__dirname, '..');

export interface SkillManifestEntry {
  name: string;
  description: string;
  sizeBytes: number;
}

export interface GenResult {
  outFile: string;
  manifest: SkillManifestEntry[];
}

/**
 * Walk `<srcDir>/*.md`, read each file, and emit a single TS module at
 * `<outFile>` exporting:
 *
 *   - `SKILLS`: an `as const` record from skill name to the full markdown
 *     content (via `JSON.stringify`, so the embedded value is the exact
 *     bytes including newlines).
 *   - `MANIFEST`: an `as const` array of `{ name, description, sizeBytes }`
 *     where `description` is the first paragraph after the H1 and
 *     `sizeBytes` is `Buffer.byteLength(content, 'utf8')`.
 *   - `SkillName`: `keyof typeof SKILLS`.
 *
 * The same module shape is consumed by `src/commands/core/skills.ts` and
 * is intentionally agent-browser-style — codegen at build time means the
 * shipped bin is self-contained even though `skills/*.md` lives outside
 * the compiled output.
 */
export function runGen(srcDir: string, outFile: string): GenResult {
  if (!existsSync(srcDir)) {
    throw new Error(`[gen-skills] source dir does not exist: ${srcDir}`);
  }

  const files = readdirSync(srcDir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    throw new Error(`[gen-skills] no skill markdown files found under ${srcDir}`);
  }

  const skills: Array<{ name: string; content: string }> = [];
  const manifest: SkillManifestEntry[] = [];

  for (const file of files) {
    const name = file.replace(/\.md$/, '');
    const content = readFileSync(join(srcDir, file), 'utf8');
    skills.push({ name, content });
    manifest.push({
      name,
      description: extractDescription(content),
      sizeBytes: Buffer.byteLength(content, 'utf8'),
    });
  }

  ensureDir(dirname(outFile));
  writeFileSync(outFile, emitModule(skills, manifest));

  return { outFile, manifest };
}

/**
 * The description is the first non-empty paragraph after the H1 heading.
 * A paragraph is delimited by a blank line. If the file has no H1 or no
 * paragraph after it, fall back to the first non-empty line.
 */
export function extractDescription(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let i = 0;

  // Skip until we find the first H1 (or hit EOF).
  while (i < lines.length && !/^#\s+/.test(lines[i]!)) i++;
  if (i < lines.length) i++; // step past the H1 itself

  // Skip blank lines.
  while (i < lines.length && lines[i]!.trim() === '') i++;

  // Collect until the next blank line.
  const paragraph: string[] = [];
  while (i < lines.length && lines[i]!.trim() !== '') {
    paragraph.push(lines[i]!.trim());
    i++;
  }

  if (paragraph.length > 0) return paragraph.join(' ');

  // Fallback: first non-empty line in the whole file.
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) return trimmed.replace(/^#+\s*/, '');
  }
  return '';
}

function emitModule(
  skills: Array<{ name: string; content: string }>,
  manifest: SkillManifestEntry[],
): string {
  const skillEntries = skills
    .map((s) => `  ${JSON.stringify(s.name)}: ${JSON.stringify(s.content)}`)
    .join(',\n');

  const manifestEntries = manifest
    .map(
      (m) =>
        `  { name: ${JSON.stringify(m.name)}, description: ${JSON.stringify(m.description)}, sizeBytes: ${m.sizeBytes} }`,
    )
    .join(',\n');

  return `// GENERATED — do not edit. Run \`nx run cli:gen-skills\` to refresh.
export const SKILLS = {
${skillEntries},
} as const;

export const MANIFEST = [
${manifestEntries},
] as const;

export type SkillName = keyof typeof SKILLS;
`;
}

function ensureDir(p: string): void {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

// CLI entry — invoked by Nx target.
if (require.main === module) {
  const srcDir = join(CLI_ROOT, 'skills');
  const outFile = join(CLI_ROOT, 'src/generated/skills.ts');
  const { manifest } = runGen(srcDir, outFile);
  console.log(`[gen-skills] generated ${manifest.length} skill(s) → ${outFile}`);
}
