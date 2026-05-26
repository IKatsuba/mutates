import type { SnapshotEntry, SnapshotResult } from '../session/snapshot';

/**
 * Render a {@link SnapshotResult} as the human-readable text shown in
 * design.md (see the "Snapshot rendering" example).
 *
 * Example output:
 *
 *   File: src/app.ts
 *   @n1 [import] from "rxjs"
 *   @n2 [class] AppService exported
 *   @n3 [function] helper exported
 */
export function formatSnapshot(snapshot: SnapshotResult): string {
  const lines: string[] = [`File: ${snapshot.file}`];
  for (const entry of snapshot.entries) {
    lines.push(formatEntry(entry));
  }
  return lines.join('\n') + '\n';
}

function formatEntry(entry: SnapshotEntry): string {
  const parts: string[] = [`${entry.ref} [${entry.kind}]`];
  if (entry.kind === 'import' && entry.name) {
    parts.push(`from ${JSON.stringify(entry.name)}`);
  } else if (entry.name) {
    parts.push(entry.name);
  }
  if (entry.modifiers && entry.modifiers.length > 0) {
    parts.push(entry.modifiers.join(' '));
  }
  if (entry.children !== undefined && entry.children > 0) {
    parts.push(`(${entry.children} children)`);
  }
  return parts.join(' ');
}
