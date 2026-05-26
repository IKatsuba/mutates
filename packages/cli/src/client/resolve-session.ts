/**
 * Resolve the session id to use for a CLI command.
 *
 * The contract for agents (`mutates skills get core`) promises that the
 * `snapshot → mutate → save` loop works across separate CLI
 * invocations. To honour that, when `--session` isn't pinned we look up
 * any session that the daemon already has open for this root and reuse
 * it. Only if zero sessions exist do we open a fresh one — and then
 * future invocations will pick that one up via the same lookup.
 *
 * Without this logic each `mutates …` command would open its own
 * session, and mutations applied by one invocation would never be
 * visible to the next.
 */
export async function resolveSessionId(
  conn: { call: <R>(method: string, params?: unknown) => Promise<R> },
  root: string,
  explicit: string | undefined,
): Promise<string> {
  if (explicit) return explicit;
  const sessions = await conn.call<Array<{ id: string; root: string }>>('session.list', {});
  // The daemon is per-root (Req 10.1) so every session it carries
  // already belongs to `root`; nonetheless filter defensively in case a
  // future change relaxes that and to keep this helper independent of
  // the daemon's invariant.
  const match = sessions.find((s) => s.root === root) ?? sessions[0];
  if (match) return match.id;
  const opened = await conn.call<{ sessionId: string }>('session.open', { root });
  return opened.sessionId;
}
