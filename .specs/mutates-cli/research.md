---
status: APPROVED
created: 2026-05-26
updated: 2026-05-26
---

# Research: @mutates/cli

## Problem Statement

`@mutates/core` exposes a large surface of CRUD helpers over the TypeScript
AST (14 categories × ~4 verbs each), but they can only be called from
Node.js code. AI agents currently have to generate throwaway scripts to
use it, losing the cross-call in-memory state that ts-morph's `Project`
needs to operate efficiently.

The CLI must wrap this API as a long-lived-daemon tool modelled on
`agent-browser`: short `@nN` refs assigned by snapshots, mutations applied
in memory, explicit save with conflict detection, and embedded
self-documentation. This research identifies the five architectural
decisions that materially affect effort, risk, and the agent UX, and
selects one variant per decision.

## Problem Areas

### 1. Daemon hosting + IPC + session discovery

_Related requirements: 2 (session lifecycle), 10 (multi-session)._

#### Variant A: Unix domain socket + JSON-RPC — CHOSEN

**How it works:** CLI auto-spawns a detached Node child
(`child_process.spawn(..., { detached: true, stdio: 'ignore' })`). The
daemon listens via `net.createServer()` on a path under
`$XDG_RUNTIME_DIR/mutates/<sessionId>.sock` (Unix) or
`\\.\pipe\mutates-<sessionId>` (Windows). The same `path` option works
for both, so it's a single code path. CLI ↔ daemon speak newline-delimited
JSON-RPC 2.0. Discovery via a sibling lockfile holding PID + socket path,
keyed by project root.

**Pros:** sub-ms round-trip; built into Node core, zero deps; no firewall
prompts; permission bits restrict to the spawning user; same pattern used
by tsserver, the VS Code LSP, pnpm-daemon, Volta.

**Cons:** manual framing; stale socket files after crashes need defensive
`unlink`; idle timeout hand-rolled with `setTimeout` reset on each
message.

**Effort:** Med | **Risk:** Low

**Why chosen:** Lowest IPC overhead matters for a tool used in a tight
agent loop. Cross-platform abstraction via `net` is free. Auth is implicit
in file-system permissions, sidestepping the loopback-token problem of
HTTP/WS.

#### Variant B: HTTP loopback (Fastify) — Rejected

**Why rejected:** macOS Little Snitch / Windows Defender prompts on first
bind would surprise users; any local user could hit the daemon without an
explicit auth token; TCP handshake + HTTP parsing latency is ~10× a Unix
socket; we don't need REST debuggability for an agent-targeted protocol.

#### Variant C: WebSocket loopback — Rejected

**Why rejected:** Inherits HTTP's firewall and auth issues; the
bidirectional channel is overkill for stateless one-shot CLI calls;
adds a `ws` dependency without enabling required functionality.

#### Variant D: Compiled sidecar (Rust/Go via napi-rs) — Rejected

**Why rejected:** ts-morph itself is a Node library — the daemon must
run in Node. A sidecar would only host the IPC shell, not the worker,
which doesn't justify the multi-platform build matrix or two-language
codebase.

### 2. CLI framework

_Related requirements: 1 (distribution), 5 (operations), 8 (output contract), 9 (self-docs)._

#### Variant A: citty (UnJS) — CHOSEN

**How it works:** Declarative command objects with TypeScript-inferred
args; each subcommand can be a dynamic `import()`, so the entry only
loads what was invoked. Designed for `unbuild`/`bun build`.

**Pros:** lazy subcommand resolution keeps cold start fast at 60
commands; strong arg type inference; tiny bundle; modern and actively
maintained (Nuxt CLI / `nuxi`, `nypm`, `nitro`); naturally bundles into
a single-file bin.

**Cons:** smaller ecosystem than commander/oclif; no built-in plugin
system; help output less polished than oclif out of the box.

**Effort:** Low | **Risk:** Med

**Why chosen:** Two factors dominate: cold start under 60 subcommands
(citty's lazy loading is purpose-built for this), and the codegen
strategy (Area 1 of Open Questions) — citty's plain TS command objects
are trivial to emit programmatically from `@mutates/core` option types.

#### Variant B: commander — Rejected

**Why rejected:** No lazy loading — every subcommand must be registered
upfront, pushing cold start when we reach ~60 commands; help formatting
at that scale becomes a wall of text without manual grouping; type
inference too weak for codegen workflow.

#### Variant C: oclif — Rejected

**Why rejected:** Heaviest of the candidates (~3-5MB), slowest cold
start (80-150ms); plugin system and auto-manpages are not requirements;
bundling to single-file bin requires extra effort because oclif assumes
node_modules layout.

#### Variant D: cac — Rejected

**Why rejected:** Less ergonomic than citty for deeply nested commands;
weaker type inference for codegen.

### 3. Node reference model (`@nN`)

_Related requirements: 4 (refs and staleness), 5 (mutation targeting)._

#### Variant A: WeakRef + sequential IDs, invalidated on mutation — CHOSEN

**How it works:** On `snapshot`, walk the file, mint `@n1..@nN` and
store `WeakRef<Node>` in a per-file `Map`. On any mutation that touches
that file, drop the Map; the agent must re-snapshot. Every resolve
checks `Node.wasForgotten()` and returns `STALE_REF` if true.

**Pros:** token-efficient (`@n7` is 3 tokens); 1-to-1 with the
agent-browser invalidation model the user already endorsed; cheap to
mint; `WeakRef` allows GC if a snapshot is abandoned.

**Cons:** refs don't survive daemon restart; agents that snapshot once
then make N edits must re-snapshot between each; ts-morph wrapper
forgetting (via `wasForgotten()`) must be checked on every resolve
because manipulation methods replace underlying compiler nodes.

**Effort:** Low | **Risk:** Med

**Why chosen:** Direct fulfilment of Requirement 4 and continuity with
the chosen session model. Snapshot/act/re-snapshot is the very rhythm
this CLI is designed for — refs surviving mutations would invite agents
to operate on stale state.

#### Variant B: Path selectors (`Foo/bar`) — Rejected

**Why rejected:** Verbose (high token cost per command); ambiguous for
anonymous nodes (arrow functions, object literals, overloads); doesn't
match the snapshot/refresh model in Requirement 4.

#### Variant C: Hybrid id+path — Rejected

**Why rejected:** Most complex of the four; survival across mutations
is not a requirement we have; the two-layer model is harder to
document for agents.

#### Variant D: AST-position offsets — Rejected

**Why rejected:** Worst token economy (`src/foo.ts:120-145` ≫ `@n7`);
any edit before the range shifts offsets and silently invalidates
multiple refs at once.

### 4. Filesystem conflict detection

_Related requirements: 7 (FS conflict detection)._

#### Variant A: mtime + size compared at save — CHOSEN

**How it works:** Record `(mtimeMs, size)` for each `SourceFile` at the
moment it is loaded or last `save`d. On `save`, `fs.stat` each target
and compare; if either differs, exit with `STALE_FILE` and write nothing.

**Pros:** single stat call per file at save preflight; standard
approach (Git's racy-check, webpack/turbopack fast path); scales
trivially to thousands of files; no extra I/O during normal operation.

**Cons:** false positives from formatters or `touch` (mtime changes
without content change); FS resolution edge cases on FAT (2s).

**Effort:** Low | **Risk:** Low

**Why chosen:** Cheapest viable approach; fits the MVP scope (Req 7.3
explicitly excludes auto-reload). False positives manifest as a
spurious `STALE_FILE` that the agent resolves by inspecting `diff` and
either accepting or re-running — acceptable for MVP.

#### Variant B: SHA-256 / xxhash — Rejected

**Why rejected:** Zero false positives, but the extra full-file read on
every save is unjustified for MVP; can be added later as a
post-mismatch fallback (see Open Questions).

#### Variant C: chokidar continuous watcher — Rejected

**Why rejected:** Heavy (~50k LOC of edge cases); known issues on
network drives and deep macOS trees; event storms during `git
checkout` / `npm install` would flap the staleness flag; out of scope
for MVP per Req 7.3.

#### Variant D: `SourceFile.refreshFromFileSystem()` only — Rejected

**Why rejected:** This is on-demand re-parsing, not detection — it
*resolves* a conflict, not *detects* it. Useful inside `mutates reload`
as a post-MVP feature, but doesn't satisfy Req 7.2 by itself.

### 5. Embedded skill markdown

_Related requirements: 9 (self-documentation for agents)._

#### Variant A: Codegen `.md` → `.ts` module — CHOSEN

**How it works:** A prebuild script reads `packages/cli/skills/*.md`
and emits `packages/cli/src/generated/skills.ts` exporting
`export const core = "..."` (with a manifest mapping names → content).
The CLI imports from the generated module.

**Pros:** generated artifact is a plain TS module — works in every
bundler, runtime, and single-file packer (`ncc`, `bun build --compile`,
`pkg`) without per-tool config; source of truth stays as editable
`.md`; easy to add metadata (versions, hashes) in the same step.

**Cons:** generated file must be either gitignored (build step required
for IDE navigation) or committed (drift risk); template-literal
escaping for backticks and `${` needs care.

**Effort:** Med | **Risk:** Low

**Why chosen:** Decouples the skill-shipping mechanism from the
bundler. `?raw` imports are tied to specific bundlers; readFileSync
breaks under single-file packers without per-tool asset config. Codegen
is the most portable option as the toolchain evolves.

#### Variant B: `?raw` imports (bundler inline) — Rejected

**Why rejected:** Tied to a specific bundler convention (Vite/esbuild
loader config / `with { type: 'text' }`); requires ambient TS module
declaration; locks future build-tool choice.

#### Variant C: Ship `.md` + `readFileSync` — Rejected

**Why rejected:** Breaks under single-file bundlers (ncc/pkg/bun
--compile) unless explicitly copied as assets — exactly the case we
want to support cleanly.

## Summary

| Problem Area | Chosen Variant | Effort | Risk |
|---|---|---|---|
| 1. Daemon + IPC + discovery | Unix socket + JSON-RPC | Med | Low |
| 2. CLI framework | citty | Low | Med |
| 3. Node refs | WeakRef + seq IDs, invalidate on mutation | Low | Med |
| 4. FS conflicts | mtime + size at save | Low | Low |
| 5. Skill markdown | Codegen `.md` → `.ts` | Med | Low |

## Codebase Insights

- **API is uniformly shaped.** All 14 categories follow `add* / edit* /
  remove* / get*` with consistent factory helpers
  (`getDeclarationCreator`, `getDeclarationEditor`). Command codegen can
  walk this regularity instead of hand-listing 60 commands.
- **Singleton active project.** `packages/core/src/lib/project/project.ts`
  uses module-level `prevProject` and `getActiveProject()` everywhere.
  The CLI's session model maps a daemon-side "active project per
  session" to this singleton — the daemon process owns exactly one
  active project at a time per Node `require` cache. Multi-session
  parallelism (Req 10) therefore needs either (a) one daemon process per
  session, or (b) refactoring `@mutates/core` to accept an explicit
  project — see Open Questions.
- **In-memory FS already exists.** `createTestingProject()` uses
  `InMemoryFileSystemHost`. Useful for unit-testing the daemon without
  touching disk, and for the future `--dry-run`-only mode if we ever
  want a fully isolated sandbox.
- **Build toolchain is `@nx/js:tsc` → CJS.** The new CLI package can
  reuse the same executor; for the bin we'll likely need a single-file
  bundle step (tsdown / unbuild / ncc) on top.
- **Node 18+ implied** (`@types/node: 18.16.9`). `WeakRef` (Node 14.6+)
  and `node:net` IPC are safely available.
- **Operation signatures differ in shape.** `addClasses(pattern,
  structures)` takes a glob *pattern* + structures, while
  `addMethods(classes, methods)` takes already-resolved nodes. The CLI
  has to bridge both: when the target is `@nN` it resolves to nodes;
  when it's `--file ... --filter ...` it runs a `get*` first. The codegen
  must classify each command by its target shape.

## Open Questions

- [ ] **Multi-session vs. singleton `getActiveProject()`.** The simplest
  way to support multiple parallel sessions is one daemon process per
  project root (each daemon imports `@mutates/core` once, owns one
  active project). Alternative: refactor `@mutates/core` to accept an
  explicit `Project` parameter on every function. Decide in design
  phase. Default assumption: process-per-session.
- [ ] **JSON-RPC framing.** Newline-delimited JSON vs. LSP-style
  `Content-Length` headers. NDJSON is simpler; LSP framing is more
  robust against embedded newlines. Decide in design.
- [ ] **Idle timeout default.** Requirement 2.4 says "documented
  default" but doesn't fix the value. Suggestion: 10 minutes (matches
  agent-browser); confirm in design.
- [ ] **Hash fallback after mtime mismatch.** Whether to escalate to a
  content hash to suppress false positives from formatters before
  returning `STALE_FILE`. Cheap to add; decide in design.
- [ ] **Generated `skills.ts` — gitignore or commit.** Committed → no
  build step for IDE; gitignored → no drift risk. Tooling-style choice;
  decide in design.
- [ ] **Codegen authority.** Build commands from `@mutates/core` option
  types using `ts-morph` itself (eat the dogfood) or
  `ts-json-schema-generator`. Decide in design.

## Next Steps

Ready for `spec:design mutates-cli` to convert these choices into
component boundaries, IPC schemas, and the codegen pipeline.
