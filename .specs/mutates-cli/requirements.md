---
status: APPROVED
created: 2026-05-26
updated: 2026-05-26
---

# Requirements Document

## Introduction

`@mutates/core` exposes a rich API for mutating the TypeScript AST built on top of
`ts-morph`. Today it is only consumable from Node.js code, which forces AI agents
to either generate and execute throwaway scripts or wrap the package themselves —
both are slow, error-prone, and lose the cross-call state that a live `ts-morph`
`Project` needs to operate efficiently.

This spec defines a command-line interface, distributed as the new package
`@mutates/cli` and shipped as the `mutates` binary, whose primary user is an AI
agent. The CLI follows the long-lived-daemon model used by `agent-browser`: a
single background process holds an in-memory `Project`, individual CLI commands
talk to it over a local channel, and the agent works in a tight loop of
*snapshot → act → re-snapshot* against compact node references. The MVP covers
only operations already provided by `@mutates/core` (imports, classes, methods,
functions, properties, decorators, variables, etc.); framework-specific packages
(`@mutates/angular`, `@mutates/nx`) are out of scope.

## Glossary

- **CLI** — The `mutates` executable installed from `@mutates/cli`.
- **Daemon** — The background process spawned by the CLI that owns the
  in-memory `ts-morph` `Project` for one session.
- **Session** — An isolated daemon instance scoped to one project root; identified
  by an opaque session id and addressable across CLI invocations.
- **Snapshot** — A compact, machine-readable listing of a source file's
  top-level AST nodes, with a node reference assigned to each.
- **Node reference (`@nN`)** — A short identifier (e.g. `@n3`) issued by a
  snapshot that the agent passes back into mutation commands instead of writing
  selectors. Refs are session-scoped and become stale after any mutation that
  touches the same file.
- **Operation category** — A group of CRUD verbs over one AST entity type
  (e.g. *classes* has `add-class`, `edit-class`, `remove-class`, `get-classes`).
- **In-memory mutation** — A change applied to the daemon's `Project` but not
  yet written to disk.
- **Save** — Flushing all pending in-memory mutations of a session to disk.
- **Dry-run save** — Computing what *would* be written to disk without
  modifying any file.
- **Stale file** — A source file whose on-disk content has changed since the
  session loaded or last reloaded it.
- **Skill content** — Narrative markdown documentation (per the
  `agent-browser skills get` pattern) shipped inside the binary so that agents
  can fetch a guide that always matches the installed version.

## Requirements

### Requirement 1: CLI distribution and entry point

**User Story:** As an AI agent, I want a single binary I can invoke, so that I
do not need to write or maintain my own glue code over `@mutates/core`.

#### Acceptance Criteria

1. THE CLI SHALL be distributed as a published npm package named `@mutates/cli`
   that installs a single executable named `mutates`.
2. THE CLI SHALL be invokable without any project-local installation when run
   as `npx @mutates/cli` or after global install.
3. THE CLI SHALL operate against the current working directory by default and
   SHALL accept an explicit project root via a `--root <path>` flag.

### Requirement 2: Session lifecycle

**User Story:** As an AI agent, I want sessions to start automatically and clean
themselves up, so that I do not have to manage daemon processes manually, while
still being able to close them deterministically when I am done.

#### Acceptance Criteria

1. WHEN the agent runs any mutation, snapshot, or save command without an
   active session for the target project root THEN the CLI SHALL auto-spawn a
   new daemon, load the project, and bind a session to that root.
2. THE CLI SHALL allow explicit session creation via `mutates open <root>`
   that returns a stable session id and the path of the loaded `tsconfig.json`
   (or the synthetic project root used if none was found).
3. THE CLI SHALL allow explicit shutdown via `mutates close [session]` and
   bulk shutdown via `mutates close --all`.
4. THE Daemon SHALL terminate itself after an idle period during which no
   command has been received for that session. The default idle timeout SHALL
   be configurable via a flag or environment variable, with a documented
   default value.
5. WHEN a session is auto-spawned THE CLI SHALL reuse an existing live daemon
   for the same project root rather than starting a second one.
6. THE CLI SHALL provide `mutates sessions list` that returns the id, project
   root, age, and number of in-memory unsaved files for every live session.
7. WHEN a command is invoked against a session id that does not exist or has
   exited THE CLI SHALL exit non-zero with error code `SESSION_NOT_FOUND` and
   SHALL NOT auto-spawn a replacement.

### Requirement 3: Snapshot and discovery

**User Story:** As an AI agent, I want to inspect the AST of a source file in a
compact, token-efficient form, so that I can decide what to mutate without
reading raw TypeScript source.

#### Acceptance Criteria

1. THE CLI SHALL expose `mutates snapshot <file>` that returns the file's
   top-level declarations (imports, classes, functions, variables, interfaces,
   enums, type aliases, exports) with one entry per declaration.
2. EACH snapshot entry SHALL include a node reference of the form `@nN`, a
   kind label (e.g. `class`, `function`, `import`), the declaration name when
   present, and minimal modifier hints (e.g. `exported`, `async`, `default`).
3. THE CLI SHALL allow drilling into a container by passing a node reference:
   `mutates snapshot @nN` SHALL list the immediate children of that node (e.g.
   methods and properties of a class), each with its own `@nN` reference.
4. THE CLI SHALL provide `mutates list-files [glob]` that lists source files
   currently loaded into the session.
5. THE CLI SHALL accept an `--json` flag on every read command that switches
   output to a stable JSON shape suitable for parsing by an agent.

### Requirement 4: Node references and staleness

**User Story:** As an AI agent, I want short references that I can pass back
into mutation commands, and I want clear errors when they expire, so that I
never silently mutate the wrong node.

#### Acceptance Criteria

1. THE Daemon SHALL assign node references per session and SHALL guarantee
   that a reference resolves to the same AST node until that node is mutated
   or its containing file is mutated or reloaded.
2. WHEN any mutation command modifies a file THE Daemon SHALL invalidate every
   node reference associated with that file.
3. WHEN a command receives a node reference that has been invalidated THE CLI
   SHALL exit non-zero with error code `STALE_REF`, naming the file that must
   be re-snapshotted.
4. THE Daemon SHALL NOT reuse the numeric portion of an invalidated reference
   within the same session for at least one snapshot cycle of the same file,
   so that an agent reusing an old reference receives `STALE_REF` rather than
   silently hitting an unrelated new node.

### Requirement 5: Mutation operations (parity with `@mutates/core`)

**User Story:** As an AI agent, I want every CRUD operation that
`@mutates/core` exposes today to be available as a CLI command, so that I do
not have to drop down to a script for any common AST edit.

#### Acceptance Criteria

1. THE CLI SHALL expose at minimum the following operation categories, each
   with `add`, `edit`, `remove`, and `get` verbs where the corresponding
   functions exist in `@mutates/core`: imports, classes, methods, functions,
   properties, decorators, variables, interfaces, enums, exports, accessors,
   type aliases, constructors, parameters.
2. THE CLI SHALL name each command in the form `<verb>-<category>` (e.g.
   `add-method`, `remove-decorator`, `get-classes`) and SHALL preserve the
   semantics of the corresponding `@mutates/core` function.
3. EACH mutation command SHALL accept the target as either a node reference
   (`@nN`) or a file path plus a structured filter (e.g. `--file src/app.ts
   --filter '{"name":"AppService"}'`).
4. EACH mutation command SHALL accept its structure payload as JSON, either
   inline via `--json '<json>'` or from stdin when `--json -` is passed.
5. THE CLI SHALL provide a `mutates find <kind>` command for semantic
   selection without a prior snapshot (e.g. `mutates find class --name
   AppService`), returning a node reference resolvable by other commands.
6. THE CLI SHALL apply every mutation in memory only and SHALL NOT write to
   disk until an explicit save command is issued.

### Requirement 6: Persistence, diff, and dry-run

**User Story:** As an AI agent, I want to preview changes before committing
them to disk and to flush them when I am confident, so that I never leave a
project in a half-mutated state.

#### Acceptance Criteria

1. THE CLI SHALL expose `mutates diff [file]` that returns a unified diff
   between the in-memory state of the session and the current on-disk content,
   scoped to the given file or to the whole session when omitted.
2. THE CLI SHALL support `--format json` on `diff` returning per-file
   structured changes (path, before, after) suitable for an agent to inspect.
3. THE CLI SHALL expose `mutates save [file]` that writes all in-memory
   mutations of the session (or only the given file) to disk and clears the
   pending state for those files.
4. THE CLI SHALL expose `mutates save --dry-run` that performs the same
   change computation as `save` and reports what would be written, without
   modifying any file on disk and without clearing pending state.
5. WHEN `save` succeeds THE CLI SHALL return the list of written file paths
   in its output.

### Requirement 7: Filesystem conflict detection

**User Story:** As an AI agent, I want the CLI to refuse to overwrite a file
that has been changed by something else (an IDE, a formatter, git), so that I
never silently lose work that I did not produce.

#### Acceptance Criteria

1. THE Daemon SHALL record an identity (e.g. mtime and size, or content hash)
   for every source file at the moment it is loaded into the session.
2. WHEN `save` is invoked and any file to be written has changed on disk
   since it was loaded THEN the CLI SHALL exit non-zero with error code
   `STALE_FILE`, naming the conflicting file(s), and SHALL NOT write any file
   in the same save call.
3. THE CLI SHALL NOT auto-reload a stale file as part of any command in the
   MVP; resolving the conflict is the agent's responsibility.
4. WHEN a `STALE_FILE` error is returned THE in-memory mutations of the
   session SHALL remain intact so that the agent can inspect them via `diff`
   before deciding how to proceed.

### Requirement 8: Output contract and error model

**User Story:** As an AI agent, I want every command to produce predictable
machine-readable output and predictable failure signals, so that I can build
reliable loops without parsing prose.

#### Acceptance Criteria

1. EVERY CLI command SHALL support `--json` (or equivalent default) producing
   output that conforms to a documented schema for that command.
2. THE CLI SHALL exit with code `0` on success and a non-zero code on any
   failure.
3. WHEN a command fails THE CLI SHALL emit a JSON error object on stderr with
   at least the fields `code`, `message`, and `details`, where `code` is one
   of a documented enumerated set including at minimum `SESSION_NOT_FOUND`,
   `STALE_REF`, `STALE_FILE`, `INVALID_INPUT`, `NOT_FOUND`, `IO_ERROR`,
   `INTERNAL_ERROR`.
4. THE CLI SHALL NOT mix human-only prose into stdout when `--json` is in
   effect; all human-targeted text SHALL go to stderr.

### Requirement 9: Self-documentation for agents

**User Story:** As an AI agent encountering `mutates` for the first time, I
want to fetch a usage guide that matches the installed version, so that I do
not generate commands or fields that the binary does not actually support.

#### Acceptance Criteria

1. THE CLI SHALL expose `mutates skills list` that returns the names and
   short descriptions of every embedded skill guide.
2. THE CLI SHALL expose `mutates skills get <name>` that returns the full
   markdown content of the named skill guide; at minimum a `core` guide SHALL
   be shipped covering the snapshot/ref workflow, all operation categories,
   common patterns, and troubleshooting of `STALE_REF` and `STALE_FILE`.
3. THE skill content returned by `mutates skills get` SHALL be embedded in
   the binary at release time so that it can never drift from the installed
   version.
4. THE CLI SHALL provide a standard `--help` for each command that lists
   flags and a one-line description for human use.

### Requirement 10: Multi-session and concurrency

**User Story:** As an AI agent that sometimes operates on more than one
project at a time, I want isolated sessions per project root, so that
mutations in one project do not interfere with another.

#### Acceptance Criteria

1. THE CLI SHALL support multiple concurrent sessions, each bound to a
   distinct project root.
2. EVERY command except `mutates open`, `mutates close --all`, `mutates
   sessions list`, and `mutates skills *` SHALL accept a `--session <id>`
   flag to target a specific session, and SHALL default to the session bound
   to the current working directory when omitted.
3. THE CLI SHALL serialize commands within a single session so that two
   concurrent mutation calls against the same session never observe
   inconsistent intermediate state.

## Out of scope (MVP)

The following are explicitly **not** required by this spec and are deferred to
follow-up work:

- Operations and commands sourced from `@mutates/angular` or `@mutates/nx`.
- Undo of the last operation and a session history command.
- Auto-reload of files that have changed on disk.
- Embedded MCP server mode (`mutates mcp`).
- Declarative batch mode (`mutates apply plan.json`).
- Authentication, sandboxing, or restricting writes to the project root.

## Superseded Behaviors

This feature is additive — no existing `@mutates/core` API is removed or
changed by the introduction of the CLI.
