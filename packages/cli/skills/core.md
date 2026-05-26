# mutates core

`mutates` is a long-lived daemon plus thin CLI that exposes structural
TypeScript edits to AI agents. The daemon is auto-spawned per project
root, listens on a Unix domain socket, and answers JSON-RPC requests
over newline-delimited JSON. Every command in the CLI is a one-shot
wrapper that connects to the daemon, sends one request, prints the
response, and exits — so the agent sees stable, line-oriented stdin and
stdout and never has to manage a long-running child process. Mutations
operate on in-memory ts-morph nodes addressed by short, opaque
references called `@nN` ("at-n-N"), which are issued by `snapshot` and
consumed by every mutating op. The agent is expected to write nothing
to disk until it explicitly calls `mutates save`, and the daemon is
expected to forget everything when its idle timeout fires.

The contract between agent and CLI is deliberately simple:

- Output is one JSON value per command when `--json` is set, or a
  human-friendly rendering otherwise. Errors always go to stderr as a
  one-line JSON `{ code, message, details? }` envelope.
- Exit codes are stable and symbolic: `0` on success, `2` for
  `INVALID_INPUT`, `3` for `NOT_FOUND`, `4` for `SESSION_NOT_FOUND`,
  `5` for `STALE_REF`, `6` for `STALE_FILE`, `7` for `IO_ERROR`, `1`
  for everything else.
- Refs are session-scoped, mutation-invalidated tokens. Treat them as
  ephemeral; resnap when in doubt.
- The daemon, the socket, the lockfile, and the runtime directory are
  all conveniences you should never have to think about. Just call
  the CLI.

## The snapshot/act/re-snapshot loop

The canonical workflow is **open → snapshot → act → save**, with a
re-snapshot in between any two mutations that touch the same file.

1. `mutates open` is usually redundant because every command
   auto-opens a session for its `--root` (defaulting to `cwd`). Call it
   explicitly only when you want to capture the `sessionId` up front,
   for example because you intend to drive several commands as part
   of a larger orchestration script and want them to share state
   deterministically.
2. `mutates snapshot <file>` returns a structured outline of the
   file — top-level classes, functions, imports, exports, etc. — with
   each entry tagged by a fresh `@nN` ref. The shape of each entry
   is `{ kind, name?, ref, ... }` so an agent can scan the list and
   pick the target it needs without reading the source.
3. The agent then runs a mutating op against one of those refs:
   `mutates edit-classes @n3 --json '{"name":"NewName"}'`, or
   `mutates add-class-methods @n3 --json '{"name":"foo","statements":"return 1;"}'`.
4. The op returns either a fresh batch of refs (for `add-*` and
   `get-*`) or a confirmation envelope (for `edit-*` and `remove-*`).
5. **After any mutation that touches a file, the prior refs into
   that file are invalid.** Re-`snapshot` the file to get fresh
   refs. Sibling refs that point at unrelated files are unaffected.
6. When you're done editing, `mutates save` flushes every dirty file
   in the session to disk. Without `save`, your edits stay in
   in-memory state on the daemon and vanish when the session idles
   out.

A minimal end-to-end transcript looks like this:

```bash
mutates open --root /repo --json
# {"sessionId":"01HX...","root":"/repo"}

mutates snapshot /repo/src/app.ts --json
# {"entries":[{"kind":"class","name":"AppService","ref":"@n0"}, ...]}

mutates edit-classes @n0 --json '{"name":"App"}'
# {"changed":1}

mutates snapshot /repo/src/app.ts --json
# {"entries":[{"kind":"class","name":"App","ref":"@n0"}, ...]}

mutates save --json
# {"written":["/repo/src/app.ts"]}
```

The re-snapshot between the `edit-classes` call and the `save` is
optional in this transcript because we don't issue another mutation,
but it would be required before any further mutation against
`/repo/src/app.ts`.

## Refs

A ref like `@n7` is a session-scoped pointer to one ts-morph node.

- **Lifecycle.** Refs are minted lazily — `snapshot` mints them for
  the top-level outline, `find` mints them for query hits, every
  `get-*` op mints them for whatever it returns, and `add-*` ops
  return fresh refs to the newly created nodes. Refs are never
  recycled within a session: once invalidated, that ref id is dead
  for good.
- **Invalidation.** Refs are invalidated on every mutation that
  touches their source file, including mutations made through
  sibling refs into the same file. If you reuse a stale ref, the
  daemon returns `STALE_REF` and you must call `snapshot <file>`
  again to mint fresh ones.
- **Scope.** Refs are scoped to one session — a ref minted in
  session A is not resolvable from session B even on the same
  project root. Crossing sessions returns `STALE_REF` (the ref
  literally does not exist in the receiving session's ref table).
- **Discipline.** Treat refs as ephemeral. Hold them only across
  the single op that needs them; if you batch multiple edits to
  the same file, issue them one at a time and resnap between, or
  use a target shape that takes a file glob plus filter so the
  daemon does the resolution at apply time.

## Sessions

A session is the daemon's in-memory mirror of one project root: the
ts-morph `Project`, the dirty-file map, the ref table, and the
file-stat cache. Sessions are keyed by the absolute project root.

- **Auto-spawn.** Sessions are auto-spawned on first use — running
  any subcommand with `--root /path/to/repo` (or just running it
  inside the repo) is enough to wake a daemon and spin up the
  session. No explicit `open` is required.
- **Idle timeout.** Each session has an idle timeout, defaulting to
  **600 seconds** since the last RPC. The timeout is overridable
  via the `MUTATES_IDLE_TIMEOUT` environment variable (read by the
  daemon at spawn time) for CI runs or interactive shells where
  you want a longer-lived session. Setting it to `0` disables the
  timeout entirely; use that sparingly.
- **Listing.** To enumerate live sessions for a root, run
  `mutates sessions list --root <root> --json`. Output is a JSON
  array of `{ id, root, openedAt, lastActivityAt }`.
- **Closing.** `mutates close --all --root <root>` closes every
  session for that root; `mutates close <sessionId>` closes one by
  id. When the daemon process itself exits (idle timeout fires,
  explicit kill, host reboot), all in-memory state is gone —
  anything you didn't `save` is lost.
- **Multiple sessions per root.** Each `open` call mints a new
  session, so several agents can drive the same repo
  independently without trampling each other's refs. They share
  the underlying ts-morph project's file cache but not the ref
  table or the dirty-file map.

## Operation categories

Every category exposes some combination of `get-*`, `add-*`, `edit-*`,
and `remove-*` verbs. Run `mutates schema` for the full JSON-Schema
payload of every op, or `mutates schema --op <opName>` for one. The
list below is one line per category — for exhaustive shapes use the
schema command.

- **classes** — top-level `class` declarations.
- **methods** — methods on any host (class or object literal),
  routed through the generic methods finder.
- **class-methods** — methods scoped to class declarations
  specifically; use when you know the host is a class.
- **class-properties** — non-method class members: fields,
  instance and static properties.
- **class-accessors** — `get` / `set` accessors on a class.
- **constructors** — class constructors (one per class, but
  addressable as a category).
- **object-methods**, **object-properties**, **object-accessors**,
  **object-property** — methods, properties, accessors, and bare
  property assignments on object literals.
- **accessors** — `get` / `set` accessors regardless of host
  (class or object literal).
- **decorators** — decorators attached to a single declaration;
  use **all-decorators** when you want the project-wide finder
  for refactors that span hosts.
- **functions** — top-level `function` declarations.
- **imports** — full import declarations; **named-imports** is the
  finer category for individual specifiers inside a declaration;
  **import-refs** queries inbound references for a symbol.
- **exports** — re-exports and named exports.
- **interfaces** — interface declarations (members are edited
  through the same payload).
- **enums** — enum declarations.
- **variables** — `const` / `let` / `var` declarations (one
  statement at a time, even if the statement contains multiple
  bindings).
- **params** — parameters on functions, methods, and
  constructors.
- **source-file** / **source-files** — file-level ops (whole-file
  editor, deletion, glob queries across the project).

Op payloads always have a `target` (how to find the nodes) and, for
mutating ops, a `data` body (what to do once found). The `target`
shape varies by op:

- `pattern` — file glob plus optional structural filter. Used by
  most `add-*` ops where the new node has to land somewhere new.
- `nodes` / `declarations-editor` — accepts either a single
  `ref` or a `file` plus optional `filter`. Used by `edit-*` and
  `remove-*` where you address an existing node.

`get-*` ops always return refs alongside the structural data, so a
common pattern is `get-*` → pick → `edit-*` or `remove-*`.

## Conflict detection

The daemon tracks each loaded file's mtime and content hash at the
moment it reads the file into the session. Before every mutation and
at save time it re-stats the file and compares.

If the on-disk file has changed under you — another tool wrote it, a
git operation touched it, a human edited it in their IDE — the
daemon refuses to clobber and returns `STALE_FILE`. The recovery is
deterministic:

1. `mutates reload <file>` — discards the session's view of the
   file and re-reads it from disk.
2. `mutates snapshot <file>` — mints a fresh outline so you can
   pick new refs.
3. Re-apply your intended mutations against the fresh refs.

There is intentionally no `--force` flag for mutations: the design is
that the agent must see the new content before deciding what to do.
If the human deleted the symbol you were trying to edit, the safest
thing is to surface that to the user, not to recreate it blindly.

`save` also runs the same check immediately before writing, so a
file that goes stale between your last edit and `save` will trigger
`STALE_FILE` at save time. The other dirty files in the session are
still written; only the conflicting ones are deferred for you to
resolve.

## Troubleshooting

- **STALE_REF** — the ref you passed pointed at a node in a file
  that has since been mutated, or at a node that never existed in
  this session. **Action:** re-run `mutates snapshot <file>` and
  use a fresh ref from the response. If you don't know which file
  the ref came from, list `mutates sessions list` and re-do the
  snapshot for any file you've touched recently.
- **STALE_FILE** — the file on disk no longer matches what the
  session loaded. Another writer beat you to it. **Action:**
  `mutates reload <file>` then `mutates snapshot <file>`, then
  re-apply your edit against the new refs.
- **SESSION_NOT_FOUND** — you passed `--session <id>` for a
  session the daemon doesn't know about. Either the daemon
  restarted (idle timeout, OS reboot) or you copied an id from a
  different root. **Action:** drop the explicit `--session` flag
  and let the next command auto-open, or call
  `mutates open --root <root>` to mint a new id.
- **INVALID_INPUT** — the JSON payload didn't match the op's
  schema. **Action:** check `mutates schema --op <opName>` for
  the exact expected shape, including which fields are required
  and the allowed `target` variants. The `details` field of the
  error envelope usually points at the specific path that failed
  validation.

Every error envelope on stderr has the shape `{ code, message,
details? }`. The `code` is one of the symbolic names above. The
`message` is a one-line human-readable summary. The `details` field,
when present, carries structured context — for `STALE_REF` it
includes the ref that failed and the file it referenced; for
`STALE_FILE` it includes the path and the expected vs actual hash;
for `INVALID_INPUT` it includes the JSON Schema path that failed.

Use the exit code to branch your agent's recovery logic, and parse
the JSON to decide what to surface to the user.
