---
status: APPROVED
created: 2026-05-26
updated: 2026-05-26
---

# Implementation Plan: @mutates/cli

## Overview

The CLI is a new, unpublished package; the whole feature is additive.
The plan is split into 6 small groups ordered so each merge leaves the
monorepo in a green state — full lint, type-check, build, and vitest
pass after each group's commits are applied on top of `main`. There is
no production cutover (no consumers exist yet); the first published
release will ship the whole stack.

### Cutover points

None. Every group is additive. The only touch to existing code is one
new named export on `@mutates/core` in Group A, which is inert until
the daemon consumes it in Group C.

### The load-bearing decision: one daemon process per project root

The whole design hinges on this. `@mutates/core` keeps its
module-level `getActiveProject()` singleton; the CLI honours it by
spawning a fresh daemon process per project root and binding that
process's only `Session` to the singleton via the new
`setActiveProject` export. Multi-session = multiple daemons. This is
why Group A adds `setActiveProject` to core *before* any consumer
exists — the export is the seam through which every later group's
operation handlers plug into the existing API without changing it.

## Tasks

### Group A — Workspace scaffold + core seam (additive)

A new empty package wired into Nx, plus one new named export on
`@mutates/core`. Safe to land alone: no consumers exist for either
artefact; existing core behaviour is unchanged because all current
callers go through `createProject` / `resetActiveProject`.

- [x] 1. Create the `@mutates/cli` package skeleton
  - Create `packages/cli/package.json` mirroring `packages/core/package.json` (type=commonjs, publishConfig.access=public, repository, license). `name: "@mutates/cli"`, `bin: { mutates: "./bin/mutates.js" }`. Dependencies: `citty`, `@mutates/core` (workspace), `xxhash-wasm`, `tslib`.
  - Create `packages/cli/project.json` with two `@nx/js:tsc` targets: `build` (main=`packages/cli/src/index.ts`, additionalEntryPoints=`["packages/cli/bin/mutates.ts","packages/cli/src/daemon/entry.ts"]`, outputPath=`dist/packages/cli`) and `test` (vitest, reportsDirectory=`../../coverage/packages/cli`).
  - Create `packages/cli/tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json` mirroring core's layout. **Override `target: "es2022"` and `lib: ["es2022"]`** in `tsconfig.lib.json` because RefTable uses `WeakRef` (ES2021+) and `FinalizationRegistry`.
  - Create `packages/cli/vite.config.ts` mirroring core's, pointing at `packages/cli/src` and `coverage/packages/cli`.
  - Add `packages/cli` paths to `tsconfig.base.json`:
    - `@mutates/cli` → `packages/cli/src/index.ts`
    - `@mutates/cli/testing` → `packages/cli/src/testing.ts`
  - Append `packages/cli/vite.config.ts` to `vitest.workspace.ts`.
  - Create empty `packages/cli/src/index.ts` (re-exports the public testing helpers later).
  - **Why safe**: new workspace member; no existing target depends on it.
  - _Requirements: 1.1, 1.2_

- [x] 2. Add `setActiveProject` named export to `@mutates/core`
  - In `packages/core/src/lib/project/project.ts:7`, change the existing internal `function setActiveProject` to be exported (`export function setActiveProject(project: Project | null): Project | null`). Update its signature to accept either a real `Project` or `null` (currently it accepts the same — verify it does).
  - Confirm `packages/core/src/index.ts` re-exports everything from `./lib/project` (it does via `export * from './lib/project'`), so the new export is reachable through `@mutates/core`.
  - Add a unit test `packages/core/src/lib/project/project.spec.ts` that swaps in two distinct projects via `setActiveProject`, asserts `getActiveProject()` returns the right one, and restores the previous via the function's return value.
  - **Why safe**: pure additive named export. No existing callers; no shape change to `getActiveProject` / `resetActiveProject` / `createProject`. Verified inert until consumed in Group C.
  - _Requirements: 5.6_

- [x] 3. Stub `bin/mutates.ts` with the citty root (no subcommands yet)
  - Create `packages/cli/bin/mutates.ts`: import `defineCommand` and `runMain` from `citty`, export `main` with `meta.name = "mutates"`, `meta.version` read from package.json at build time, and an empty `subCommands` object. Top-level `run` prints a hint to use `--help`.
  - Add a smoke test `packages/cli/bin/mutates.spec.ts` that invokes `main` via `runCommand` with `--help` and asserts the rendered usage contains `mutates`.
  - **Why safe**: standalone bin with no callers; not yet wired into npm publish.
  - _Requirements: 1.1_

- [x] 4. Checkpoint — Group A verification
  - Run new tests: `npx nx run cli:test --watch=false` and `npx nx run core:test --watch=false`.
  - Run existing tests for core to catch regressions on the new export: `npx nx affected -t test --base=HEAD~1`.
  - Build everything: `npx nx run-many -t build` — confirm both `core` and `cli` build green.
  - Confirm `main` builds and lints with only Group A's commits: `npx nx run-many -t lint`.

---

### Group B — IPC protocol + daemon plumbing (inert)

Everything required to spawn a daemon, connect to it, and execute
`session.open` / `close` / `list` — no AST work yet. Safe to land
alone: only `mutates open/close/sessions` become invocable; they
exercise the new export from Group A but cannot observe any
mutation. The daemon dispatcher rejects every other method with
`MethodNotFound`.

- [x] 5. JSON-RPC framing + error codes
  - Create `packages/cli/src/proto/error-codes.ts` with the `ErrorCode` const map from `design.md` (numeric ↔ symbolic), plus a `toSymbolic(code: number): string` helper for the CLI surface mapping.
  - Create `packages/cli/src/proto/jsonrpc.ts` with: `RpcRequest`, `RpcResponse`, `RpcError` types; an `NdjsonCodec` class with `encode(msg)` / a `Transform`-stream `decode()` that emits one JSON object per `\n`-terminated line, handling partial chunks; an `RpcError` class extending `Error` carrying `code`, `data`.
  - Unit tests `proto/jsonrpc.spec.ts`: round-trips, partial-chunk reassembly across `data` events, malformed lines reject with `ParseError`.
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 6. Lockfile discovery
  - Create `packages/cli/src/discovery/lockfile.ts` exporting `lockfilePath(root: string): string` (hashes absolute root, places file under `$XDG_RUNTIME_DIR/mutates/sessions/<hash>.json` on Unix, falling back to `os.tmpdir()`); `write(lock: SessionLockfile)`; `read(root)` returning `null` if missing or PID is dead (`process.kill(pid, 0)` → `ESRCH`); `unlink(root)`.
  - Use `O_EXCL | O_CREAT` to make `write` race-safe.
  - Unit tests `discovery/lockfile.spec.ts`: write+read round trip, dead-PID detection via spawning a child that exits, race lose with second writer.
  - _Requirements: 2.5, 2.7_

- [x] 7. Daemon entry + session manager (minimum viable)
  - Create `packages/cli/src/daemon/entry.ts`: parses `--root <path>` and `--sock <path>` from argv, creates `net.createServer()` listening on the socket, writes the lockfile after successful listen, sets up SIGINT/SIGTERM handlers that gracefully drain and `unlink` the lockfile.
  - Create `packages/cli/src/daemon/session-manager.ts` exposing `SessionManager` with `open(root): Session`, `close(id)`, `list()`, and an idle timer (configurable via `MUTATES_IDLE_TIMEOUT` env / `--idle-timeout` arg, default 600000ms). The timer is reset on every dispatched RPC.
  - Create `packages/cli/src/daemon/dispatcher.ts`: maps method name → handler with `(session: Session | null, params: unknown) => Promise<unknown>` shape. Catches handler errors, wraps non-`RpcError` throws as `InternalError`. At this stage only registers stubs for `session.open`, `session.close`, `session.list` — every other method returns `MethodNotFound`. `session.open` constructs a placeholder `Session` whose body is a thin holder for `{ id, root, openedAt }` — the real Session lands in Group C.
  - Integration test `daemon/dispatcher.spec.ts`: instantiate `net.createServer` with a `Duplex` socket pair (no real subprocess), drive `session.open` → `list` → `close`, assert idle timer fires by overriding the timeout to 50ms.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 10.1, 10.3_

- [x] 8. RpcClient + spawn/discover
  - Create `packages/cli/src/client/rpc-client.ts` with `connect({ root, sessionId? }): Promise<Connection>`: reads lockfile; on miss or stale, spawns `node $entry --root <root> --sock <derived>` via `child_process.spawn` with `detached:true, stdio:'ignore', windowsHide:true`; polls for the socket (≤2s, 50ms intervals); connects; performs handshake (`session.open` if no `sessionId` passed; otherwise validates `sessionId` exists via `session.list`, throws `SessionNotFound` if not).
  - `Connection.call(method, params)`: write a framed `RpcRequest`, await response with matching id, throw `RpcError` on `error`.
  - Create `packages/cli/src/client/output.ts` with `renderError(err: RpcError)` and `renderResult(result, format: 'text' | 'json')` helpers — every command will route through these for the stdout/stderr split required by Req 8.4.
  - Integration tests `client/rpc-client.spec.ts`: spawn the real daemon binary against a tmpdir, exercise `session.open` / `list` / `close`. Tolerance: skip on CI runners without `XDG_RUNTIME_DIR` by falling back to `os.tmpdir()`.
  - _Requirements: 1.3, 2.1, 2.5, 2.7, 10.2_

- [x] 9. Hand-written commands `open`, `close`, `sessions`
  - `src/commands/core/open.ts`: args `{ root?: string }`, calls `rpc.call('session.open', { root: resolve(args.root ?? process.cwd()) })`, prints `{ sessionId, tsconfig, idleTimeoutMs }`.
  - `src/commands/core/close.ts`: args `{ session?: string, all?: boolean }`, calls `session.close` or iterates `session.list` then closes each when `--all`.
  - `src/commands/core/sessions.ts` with subcommand `list` returning the list.
  - Wire all three into `bin/mutates.ts` `subCommands` (lazy `() => import(...)` style per design).
  - E2E test `bin/mutates.spec.ts` extending Group A's: run `mutates open`, verify lockfile, run `mutates sessions list`, run `mutates close --all`, verify lockfile gone.
  - _Requirements: 1.1, 2.2, 2.3, 2.6, 2.7, 10.2_

- [x] 10. Checkpoint — Group B verification
  - Run all new tests: `npx nx run cli:test --watch=false`.
  - Run e2e bin tests for the three commands above.
  - Confirm `mutates --help` lists `open`, `close`, `sessions`; lazy import map only loads what's invoked (spot-check by sampling `process.moduleLoadList` after `mutates open`).
  - Build green; lint green.

_— Stabilize: confirm daemon shuts down cleanly on SIGTERM and removes its lockfile in a manual run. No metrics; the goal here is a clean stop before adding AST work. —_

---

### Group C — Session domain + read/save commands

Concrete `Session` owning a `ts-morph` `Project`, with RefTable,
FileStatCache, snapshot renderer, and the daemon handlers for
`snapshot`, `find`, `listFiles`, `diff`, `save`, `reload`. After this
group, `mutates` can inspect a TypeScript project and write
unmodified-in-memory files back to disk — there are no operations yet,
so `save` is a no-op-write unless a future generated `op` mutates.

- [x] 11. RefTable
  - Create `packages/cli/src/session/ref-table.ts` implementing `RefTable` per design: `Map<string, { weak: WeakRef<Node>; file: string; generation: number }>`, per-file `generation` counter, `mint(node, file)`, `resolve(ref)`, `invalidateFile(file)`, `resetFile(file)`. Resolve throws an `RpcError(StaleRef)` carrying the file path.
  - Unit tests `ref-table.spec.ts`: mint → resolve happy path; invalidateFile → resolve throws StaleRef; resetFile mints fresh sequence; `node.wasForgotten()` → StaleRef. Use `ts-morph` `InMemoryFileSystemHost` to build a tiny test project.
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 12. FileStatCache with xxhash fallback
  - Create `packages/cli/src/session/file-stat-cache.ts` per design: `record(file, fp)`, `verify(file, inMemoryText): Promise<{ok}|{ok:false, reason:'StaleFile'}>`. On mtime+size mismatch, compute `xxhash64` of disk content; compare to cached hash (or to `xxhash64(inMemoryText)` if no cached hash yet). On match, silently refresh the fingerprint.
  - Add `xxhash-wasm` to package.json dependencies; lazy-init the hasher (top-level await is fine in the daemon ESM entry — or use the sync `XXH64` factory).
  - Unit tests `file-stat-cache.spec.ts`: ok when stat matches; ok when stat mismatches but content matches (simulate `touch`); StaleFile when both diverge; verify the fingerprint is refreshed on a forgive-by-hash hit.
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 13. Session class + `withActiveProject` bridge
  - Create `packages/cli/src/session/session.ts` implementing `Session` per design. Constructor loads the project — if `<root>/tsconfig.json` exists, pass `tsConfigFilePath`; otherwise create a project with default options and lazy-load source files via `addSourceFilesAtPaths`. Records initial stat for every loaded source file.
  - Implement `withActiveProject<T>(fn: () => T): T` that calls `setActiveProject(this.project)` (the export added in Group A), runs `fn`, and restores the previous via the returned value.
  - Implement `dirtyFiles(): string[]` (iterates `project.getSourceFiles()`, returns those whose in-memory text differs from `stats.recorded[file].text`, recorded at load/save).
  - Unit tests `session.spec.ts` against `InMemoryFileSystemHost` (use `createTestingProject()` style): construct session, load a fake file, mutate in-memory via direct ts-morph, observe `dirtyFiles()`; withActiveProject correctly nests and restores.
  - _Requirements: 2.1, 2.5, 5.6, 7.1_

- [x] 14. Snapshot renderer
  - Create `packages/cli/src/session/snapshot.ts` with `snapshotFile(session, file): SnapshotResult` and `snapshotChildren(session, parentRef): SnapshotResult`. Top-level walker enumerates: imports, classes, functions, variables, interfaces, enums, type aliases, exports — in source order. Drill-down enumerates members for `ClassDeclaration` / `InterfaceDeclaration` and statements for functions.
  - Each entry: `{ ref, kind, name?, modifiers?, children? }`. Modifiers derived from ts-morph helpers (`isExported`, `isAsync`, `isDefaultExport`).
  - Create `packages/cli/src/client/format-snapshot.ts` for the text rendering shown in design.md.
  - Unit tests `snapshot.spec.ts`: tiny project with a class, function, import; assert text + JSON shape; drill into the class returns its methods/properties; refs are sequential per file.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1_

- [x] 15. Daemon handlers: `snapshot`, `find`, `listFiles`
  - Create `packages/cli/src/daemon/handlers/snapshot.ts`, `find.ts`, `list-files.ts`. Each looks up the session by id, calls the relevant `session/*` module, and returns the result. `find` translates `(kind, query)` to a `get*` from `@mutates/core` (use `getClasses`/`getFunctions`/etc., gated by `kind`), then mints fresh refs via the RefTable.
  - Register the handlers in `dispatcher.ts`.
  - Integration tests `daemon/handlers/snapshot.spec.ts`: in-process daemon, in-memory project, drive via RpcClient. Verify shape and StaleRef invalidation after a mutation simulated by a direct call to `session.refs.invalidateFile`.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.5_

- [x] 16. Daemon handlers: `diff`, `save`, `reload`
  - `packages/cli/src/daemon/handlers/diff.ts`: returns unified diffs between `session.project.getSourceFile(file).getFullText()` and the on-disk content. Use a tiny inline diff utility (e.g. `diff` package, ~1KB) to avoid hand-rolling unified format. Add `diff` to package.json.
  - `packages/cli/src/daemon/handlers/save.ts`: for each dirty file: `await session.stats.verify(file, project.getSourceFile(file).getFullText())`; if any returns `StaleFile`, throw `RpcError(StaleFile)` with the offending file names — write nothing. If all ok and `dryRun` is true, return `wouldWrite` list; else `await sourceFile.save()`, then `session.stats.record(file, fresh fp)`. Return written paths.
  - `packages/cli/src/daemon/handlers/reload.ts`: calls `sourceFile.refreshFromFileSystem()` (per ts-morph API), records new fp, invalidates refs for that file. Per Req 7.3, only invoked when the agent explicitly asks — not on any other handler.
  - Register all three.
  - Integration tests covering: dry-run does not touch disk; save writes and refreshes fingerprints; concurrent on-disk touch causes StaleFile; reload re-reads.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.4_

- [x] 17. Hand-written commands: `snapshot`, `find`, `diff`, `save`, `reload`, `list-files`
  - `src/commands/core/snapshot.ts` with args `{ target: positional, json?: boolean }` — `target` is either a path or `@nN`. Renders via `client/format-snapshot.ts` unless `--json`.
  - `src/commands/core/save.ts` with `{ file?, dryRun?: boolean, session? }`.
  - `src/commands/core/diff.ts`, `find.ts`, `reload.ts`, `list-files.ts` analogously.
  - Wire into `bin/mutates.ts` `subCommands`.
  - E2E test exercising the read-only path: `mutates open` → `mutates snapshot src/app.ts` → `mutates diff` (expect empty) against a tmpdir fixture.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 18. Checkpoint — Group C verification
  - Run new tests: `npx nx run cli:test --watch=false`.
  - E2E: against a checked-in fixture tmpdir, run snapshot/find/diff/save and verify stdout shapes via JSON parsing in the test.
  - Confirm the lockfile path is correctly cleaned on shutdown after these heavier flows.
  - Build + lint green.

---

### Group D — Codegen pipeline for operations

The bulk of the surface area. A build-time generator reads
`@mutates/core` via ts-morph, classifies every `add* / edit* / remove* /
get*` function, and emits daemon handlers, citty subcommands, and JSON
schemas. After this group, `mutates add-classes ...` and ~55 sibling
commands work.

- [x] 19. Classifier + emitter library
  - Create `packages/cli/scripts/gen-commands/classifier.ts`: opens a `Project` pointing at `packages/core/src/index.ts`, walks named exports, filters by name pattern (`/^(add|edit|remove|get)[A-Z]/`), inspects each function's first two parameter types, and returns a `Classified` record: `{ verb, category, coreName, targetShape: 'pattern' | 'nodes' | 'query' | 'declarations-editor', dataType?: TypeNode }`.
  - Create `gen-commands/emit-handler.ts`, `emit-command.ts`, `emit-schema.ts` — pure functions that take a `Classified` and return source strings. Use template strings with `JSON.stringify` for any embedded data.
  - Unit tests `gen-commands/classifier.spec.ts` and `emit-*.spec.ts`: fixed input → snapshot output; cover every `targetShape`.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 20. Driver script + Nx target
  - Create `packages/cli/scripts/gen-commands/main.ts` invoking the classifier and writing files into `packages/cli/src/daemon/handlers/generated/<category>/<verb>.ts` and `packages/cli/src/commands/generated/<category>/<verb>.ts`, plus `packages/cli/src/generated/op-schemas.ts` (one named export per op).
  - Add `packages/cli/.gitignore` listing `src/generated/`, `src/commands/generated/`, `src/daemon/handlers/generated/`.
  - In `packages/cli/project.json`, add a `gen-commands` target running `tsx scripts/gen-commands/main.ts` and add it as a dependency of `build` via `dependsOn: ["gen-commands"]`. Add `tsx` to devDependencies (or use `ts-node`).
  - Add a CI guard: a second target `gen-commands:check` that runs the emitter to a temp dir and `diff`s against the committed-as-generated state — fails CI if regen drifts from what was last produced. (Tracking only stable parts; since the files are gitignored we instead snapshot the file *count and names* in a tracked summary `packages/cli/src/generated/.manifest.json`.)
  - _Requirements: 5.1, 5.2, 5.6_

- [x] 21. Wire `op` into the dispatcher
  - Create `packages/cli/src/daemon/handlers/op.ts`: looks up the handler in a generated index (`src/daemon/handlers/generated/index.ts`, also emitted by the driver), calls `session.withActiveProject(() => handler(session, params))`, asserts mutations via `invalidateFile`, returns `{ ok: true, mutated: session.dirtyFiles() }`.
  - Register `op` in `dispatcher.ts`. Validate `params.data` against the JSON Schema from `op-schemas.ts` before dispatch; on fail, return `InvalidInput`.
  - Integration test `daemon/handlers/op.spec.ts`: call `op` with `addClasses` against an InMemoryFileSystemHost project, assert source file content includes the new class, assert refs for that file are invalidated.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 8.3_

- [x] 22. Wire generated citty commands into the bin
  - Update `packages/cli/scripts/gen-commands/main.ts` to also emit `packages/cli/src/commands/generated/index.ts`: a const map `{ "add-classes": () => import("./classes/add").then(m => m.default), ... }` over every generated command.
  - Update `bin/mutates.ts` to spread this generated map into its `subCommands` (still lazy).
  - E2E test: `mutates add-classes --file 'src/**/*.ts' --json '{"name":"Foo","isExported":true}'` against a tmpdir fixture; assert the file contains `class Foo`.
  - _Requirements: 1.1, 5.1, 5.4_

- [x] 23. Hand-written `schema` command
  - `src/commands/core/schema.ts`: args `{ op?: string, json?: boolean }`. With no `op`, returns the manifest of `{ op, category, verb, schema: <JSON Schema> }` for every generated op. With `op`, returns just that op's schema. Reads from the generated `op-schemas.ts`.
  - Wire into `bin/mutates.ts`.
  - Unit test verifies the JSON output for at least one op matches the expected JSON Schema shape (Draft 2020-12 minimum: `type`, `properties`, `required`).
  - _Requirements: 9.4_

- [x] 24. Checkpoint — Group D verification
  - Run new tests and the codegen target: `npx nx run cli:gen-commands && npx nx run cli:test --watch=false`.
  - E2E spot-check 4 commands from different categories: `add-classes`, `edit-methods`, `remove-imports`, `get-functions`.
  - Confirm `mutates schema` returns a stable manifest covering every category enumerated in Req 5.1.
  - Build + lint green; lazy import map keeps cold-start `mutates --help` under ~150ms on the developer's machine (verify with `time`).

---

### Group E — Embedded skill markdown + `mutates skills`

Source-of-truth `.md` checked in, codegen'd to TS for single-file bin
compatibility. After this group, an agent invoking `mutates skills get
core` receives the same content baked into the installed version.

- [ ] 25. Source markdown
  - Create `packages/cli/skills/core.md`: snapshot/refs workflow, common patterns, troubleshooting `STALE_REF` and `STALE_FILE`, every operation category at one-paragraph depth, and references to `mutates schema` for exhaustive payload shapes.
  - _Requirements: 9.2_

- [ ] 26. `gen-skills.ts` script + Nx target
  - Create `packages/cli/scripts/gen-skills.ts` reading every `skills/*.md` and emitting `packages/cli/src/generated/skills.ts` with `export const SKILLS = { [name]: <JSON.stringify(content)> } as const;` plus `export const MANIFEST = [{ name, description: <h1 first paragraph>, sizeBytes }]`.
  - Add `gen-skills` target in `project.json`; `build.dependsOn` adds `gen-skills`.
  - Unit test: feed a fixture markdown, assert generated module re-exports the same string verbatim.
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 27. `mutates skills` command
  - `src/commands/core/skills.ts` with subcommands `list` (prints `MANIFEST`) and `get <name>` (prints `SKILLS[name]` or exits non-zero with `NOT_FOUND`).
  - Wire into `bin/mutates.ts`.
  - E2E test: `mutates skills list` returns at least `core`; `mutates skills get core` prints the markdown.
  - _Requirements: 9.1, 9.2_

- [ ] 28. Checkpoint — Group E verification
  - Run codegen + tests: `npx nx run cli:gen-skills && npx nx run cli:test --watch=false`.
  - E2E: `mutates skills get core | wc -c` matches the expected size from the manifest.
  - Build + lint green.

---

### Group F — E2E, idle timeout integration, package polish

Final integration tests and the bits that are easier to land after the
whole stack exists.

- [ ] 29. Idle-timeout integration test
  - `packages/cli/src/daemon/idle-timeout.spec.ts`: spawn real daemon with `MUTATES_IDLE_TIMEOUT=200`, run `mutates sessions list`, wait 500ms, confirm the daemon process exited (via `process.kill(pid,0)` → ESRCH), confirm lockfile is unlinked.
  - _Requirements: 2.4_

- [ ] 30. Multi-session integration test
  - `packages/cli/src/client/multi-session.spec.ts`: open two daemons against two different tmpdir roots, run `mutates sessions list` from each `cwd`, assert each invocation only sees its own daemon, but `mutates sessions list --all` (or unscoped via env override) sees both via the lockfile directory.
  - Add the `--all` flag to `sessions list` if not already present (read from the lockfile dir).
  - _Requirements: 10.1, 10.2_

- [ ] 31. Output contract conformance test
  - `packages/cli/src/client/output.spec.ts`: parameterized over every error code in `ErrorCode`; force each error path by sending a crafted RPC, assert the stderr payload is valid JSON with `{ code, message, details }` and the exit code is non-zero per the design table.
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 32. Package README
  - Create `packages/cli/README.md` covering install, the snapshot/act/re-snapshot loop, link to `mutates skills get core` for the full guide.
  - _Requirements: (none — discoverability)_

- [ ] 33. Final checkpoint — everything green
  - Full workspace test: `npx nx run-many -t test`.
  - Full workspace build: `npx nx run-many -t build`.
  - Manual: `dist/packages/cli/bin/mutates.js --help` prints the full lazy-loaded command tree.
  - Trace every requirement in `requirements.md` to a task above (manual scan; record any uncovered SHALL in Notes).

## Notes

### Atomic-changeset invariants

- **Every task in Groups A–F is additive.** Group A's only non-cli touch is the new `setActiveProject` named export on `@mutates/core`, which has no callers until Group C's `Session.withActiveProject` consumes it.
- **No production cutover.** The package is unpublished; first publish is gated on the whole feature being green.
- **Per-group greenness.** Each group's checkpoint runs full lint + test + build on the affected projects, so `main` is independently mergeable after every group.

### Scope boundaries

- **`@mutates/angular` and `@mutates/nx` are out of scope.** Per Req
  "Out of scope (MVP)"; their categories will be added by future
  spec(s) once the codegen contract stabilizes.
- **Undo / history / auto-reload are out of scope.** Per same.
- **MCP server mode (`mutates mcp`) is out of scope.** Reserved as a
  thin layer over the same dispatcher; not part of this spec.

### Codebase verification findings

- `packages/core/src/lib/project/project.ts:7` — `setActiveProject` is currently a module-private function. Group A.2 promotes it to an exported named export; everything else (`getActiveProject`, `resetActiveProject`, `createProject`) is already public and re-exported through `src/index.ts`.
- `tsconfig.base.json` sets `target: "es2015"` and `lib: ["es2020","dom"]`. `WeakRef` and `FinalizationRegistry` need ES2021+. The new package overrides this in its `tsconfig.lib.json` (Group A.1) — there is no need to bump the base.
- `packages/core/project.json` build executor is `@nx/js:tsc` with `generateExportsField: true`. The new package reuses the same pattern, including `additionalEntryPoints` for the daemon entry and the bin.
- `vitest.workspace.ts` exists at the repo root and lists each package's vite config explicitly — Group A.1 appends to it.
- `lint-staged.config.js` + `commitlint` restrict commit scopes to `[docs, mutates, angular, core, nx]`. Implementation commits should use scope `mutates` (preferred for cross-package work) or scope `core` when only touching core; CI rejects others.
- Root `package.json` has no `engines` field. Recommend adding `"engines": { "node": ">=18" }` at the root in Group A — Node 18 is required for `WeakRef` and `node:net` IPC.
