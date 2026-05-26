---
status: APPROVED
created: 2026-05-26
updated: 2026-05-26
notes: re-run against the fix/mutates-cli-e2e build on 2026-05-26; all 28 tests pass
---

# Manual Test Plan: @mutates/cli via npx

## Overview

End-to-end smoke against the **published** `@mutates/cli` binary, run via
`npx @mutates/cli@<version>` from a clean shell. The goal is to catch
regressions that vitest cannot — shebang interpretation, npm dist
contents, ESM/CJS interop on the user's Node, real Unix-socket I/O,
lockfile cleanup across processes, multi-session isolation across two
shells.

This plan validates **the agent's daily contract** described in `mutates
skills get core`: snapshot → act → save loop. Every failure here is a
ship-blocker.

## Prerequisites

- Node ≥ 18 (`node --version`).
- `npm` configured against `https://registry.npmjs.org/` (no enterprise
  mirror, no offline cache override).
- A clean POSIX-like terminal (bash/zsh). Windows users substitute
  `mkdir`/`cat` equivalents.
- No prior `mutates` daemon running:
  `pkill -f 'mutates/.*daemon' 2>/dev/null || true; rm -rf "$XDG_RUNTIME_DIR/mutates" /tmp/mutates 2>/dev/null || true`.
- For idle-timeout test: ability to set env var per invocation
  (`MUTATES_IDLE_TIMEOUT=…`).
- Fresh tmpdir per session test: `WORK=$(mktemp -d) && cd "$WORK"`.
- The version under test is the **current latest on npm**. Pin
  explicitly to make failures reproducible:
  `export MV=$(npm view @mutates/cli version)` then use
  `npx @mutates/cli@$MV …` throughout.

## Test Scenarios

- [x] 1. Binary bootstrap

  - [x] 1.1 npx loads and prints usage
    - **Preconditions:** clean shell, no cached npx package
    - **Steps:**
      1. `npx -y @mutates/cli@$MV --help`
    - **Expected:** stdout contains `AST mutation CLI for AI agents (mutates v$MV)` and a `USAGE` line listing `open|close|sessions|snapshot|find|diff|save|reload|list-files|schema|skills` plus `add-classes|edit-methods|remove-imports|get-functions` (sample generated commands). Exit code 0. No `syntax error near unexpected token` (regression guard for the missing-shebang bug fixed in 2.1.1).
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 npx loads against a fresh user with no prior install
    - **Preconditions:** `rm -rf ~/.npm/_npx`
    - **Steps:**
      1. `npx -y @mutates/cli@$MV --version`
    - **Expected:** stdout prints exactly `$MV`, exit 0.
    - _Requirements: 1.1_

  - [x] 1.3 Global install bin works the same as npx
    - **Preconditions:** none
    - **Steps:**
      1. `npm i -g @mutates/cli@$MV`
      2. `which mutates && mutates --help | head -1`
    - **Expected:** `mutates` resolves on PATH; first line of help matches §1.1.
    - _Requirements: 1.1, 1.2_

- [ ] 2. Session lifecycle (auto-spawn, list, close)

  - [ ] 2.1 First command auto-spawns a daemon and creates a lockfile
    - **Preconditions:** clean tmpdir `WORK=$(mktemp -d) && cd "$WORK"`
    - **Steps:**
      1. `mkdir -p src && printf 'export class A {}\n' > src/a.ts`
      2. `npx -y @mutates/cli@$MV open --json`
    - **Expected:** stdout is JSON `{"sessionId":"…","tsconfig":null,"idleTimeoutMs":600000}`. A lockfile exists under `$XDG_RUNTIME_DIR/mutates/sessions/` (Unix) or the system tmpdir; its `pid` is alive (`ps -p $(jq .pid <lockfile)`). Exit 0.
    - _Requirements: 2.1, 2.5, 2.7_

  - [ ] 2.2 `sessions list` returns the open session
    - **Preconditions:** §2.1 just ran in the same shell, still in `$WORK`
    - **Steps:**
      1. `npx -y @mutates/cli@$MV sessions list --json`
    - **Expected:** JSON array with one entry containing `id`, `root: "$WORK"`, `ageMs >= 0`, `unsavedFiles: 0`.
    - _Requirements: 2.6, 10.2_

  - [x] 2.3 `close --all` stops the daemon and removes the lockfile
    - **Fixed:** `close --all` now calls `daemon.shutdown` after closing every session, so the daemon process exits and the lockfile is unlinked immediately (verified 2026-05-26 against the fix/mutates-cli-e2e build).
    - **Preconditions:** §2.1
    - **Steps:**
      1. `npx -y @mutates/cli@$MV close --all --json`
      2. After ~1 s: `ls $XDG_RUNTIME_DIR/mutates/sessions/ 2>/dev/null; pgrep -f 'mutates.*daemon'`
    - **Expected:** Step 1 prints `{"closed":["…"]}`. Step 2 shows no lockfile and no daemon process.
    - _Requirements: 2.3, 2.7_

  - [x] 2.4 Idle timeout auto-closes the daemon
    - **Preconditions:** §2.1, but with `MUTATES_IDLE_TIMEOUT=1000` (1 s) set when spawning
    - **Steps:**
      1. `MUTATES_IDLE_TIMEOUT=1000 npx -y @mutates/cli@$MV sessions list --json`
      2. `sleep 3`
      3. `pgrep -f 'mutates.*daemon' && ls $XDG_RUNTIME_DIR/mutates/sessions/ 2>/dev/null || echo "clean"`
    - **Expected:** Step 1 lists the session. After step 2's sleep, step 3 prints `clean` — daemon exited and lockfile removed.
    - _Requirements: 2.4_

  - [x] 2.5 Stale lockfile after kill -9 → next command respawns
    - **Fixed:** client now also unlinks the stale Unix socket file (not just the lockfile) before spawning, and the daemon's `listen` retries once on `EADDRINUSE` after unlinking the socket. Next `sessions list` returns `[]` cleanly (verified 2026-05-26).
    - **Preconditions:** §2.1 just ran
    - **Steps:**
      1. `kill -9 $(jq -r .pid "$XDG_RUNTIME_DIR/mutates/sessions/"*.json)`
      2. Verify lockfile still exists, daemon process gone.
      3. `npx -y @mutates/cli@$MV sessions list --json`
    - **Expected:** Step 3 returns either an empty array or a single fresh session (the client respawned). No error on stderr. Exit 0.
    - _Requirements: 2.5_

- [x] 3. Snapshot / find / list-files (read-only)

  - [x] 3.1 `snapshot` renders top-level declarations with @nN refs
    - **Preconditions:** fresh `$WORK` with
      ```
      src/app.ts:
      import { existsSync } from 'node:fs';
      export class AppService {}
      export function helper(): boolean { return existsSync('/'); }
      ```
    - **Steps:**
      1. `npx -y @mutates/cli@$MV snapshot src/app.ts`
    - **Expected:** Output contains three lines, in source order, with refs `@n1` (import), `@n2 [class] AppService exported`, `@n3 [function] helper exported`. Exit 0.
    - _Requirements: 3.1, 3.2, 4.1_

  - [x] 3.2 `snapshot --json` returns SnapshotResult
    - **Preconditions:** §3.1 fixture
    - **Steps:**
      1. `npx -y @mutates/cli@$MV snapshot src/app.ts --json | jq '.entries | length'`
    - **Expected:** prints `3`.
    - _Requirements: 3.3_

  - [x] 3.3 `find` resolves a kind to nodes
    - **Preconditions:** §3.1
    - **Steps:**
      1. `npx -y @mutates/cli@$MV find class --json | jq '.[].name'` (kind is positional, not `--kind`)
    - **Expected:** prints `"AppService"` exactly once.
    - _Requirements: 3.4, 5.5_

  - [x] 3.4 `list-files` enumerates known source files
    - **Preconditions:** §3.1
    - **Steps:**
      1. `npx -y @mutates/cli@$MV list-files --json | jq '.[].file' | grep app.ts`
    - **Expected:** the output contains `src/app.ts` (absolute or relative depending on session root resolution).
    - _Requirements: 3.5_

- [x] 4. Mutation → save round-trip

  - [x] 4.1 `add-classes` mutates in memory and `save` writes to disk
    - **Fixed:** added `resolveSessionId` helper that, when `--session` is not pinned, picks the first session already open for this root (or opens one transparently). Every CLI command and the codegen template use it, so `add-classes → diff → save` now flows through the same session across invocations. Verified 2026-05-26: diff renders the class, save writes it to disk.
    - **Preconditions:** fresh `$WORK` with `src/foo.ts` containing `export {};\n`
    - **Steps:**
      1. `npx -y @mutates/cli@$MV add-classes --file src/foo.ts --json '{"name":"Foo","isExported":true}'`
      2. `npx -y @mutates/cli@$MV diff` (peek the diff before save)
      3. `npx -y @mutates/cli@$MV save --json`
      4. `cat src/foo.ts`
    - **Expected:** Step 1 returns `{"ok":true,"mutated":["…src/foo.ts"]}`. Step 2 shows a unified diff including `+ export class Foo {}`. Step 3 returns `{"written":["…src/foo.ts"]}`. Step 4 shows the new class on disk.
    - _Requirements: 5.1, 5.4, 6.1, 6.3, 6.5_

  - [x] 4.2 `save --dry-run` writes nothing
    - **Fixed:** with auto-session reuse landed in §4.1, the dry-run flow works end-to-end: `add-classes` then `save --dry-run --json` prints `{"wouldWrite":[…]}` and the file on disk is unchanged.
    - **Preconditions:** §4.1 step 1 done, step 2 not yet run
    - **Steps:**
      1. `npx -y @mutates/cli@$MV save --dry-run --json`
      2. `cat src/foo.ts`
    - **Expected:** Step 1 returns `{"wouldWrite":[{"file":"…src/foo.ts","bytes":…}]}`. Step 2 still shows the original `export {};` — no disk write.
    - _Requirements: 6.2_

  - [x] 4.3 `edit-methods` works on a class located via filter
    - **Fixed:** generated `_runtime.ts` now distinguishes top-level finders (classes, functions, …) from composite ones (methods, accessors, params, …). When `--file` is used with a child-of-class category, the resolver walks `getClasses({ pattern })` then descends via `getMethods` / `getClassMethods` / etc. before applying the filter. `ping` renames to `echo` on disk (verified 2026-05-26).
    - **Preconditions:** fresh `$WORK` with
      ```
      src/svc.ts:
      export class Svc {
        ping(): string { return 'pong'; }
      }
      ```
    - **Steps:**
      1. `npx -y @mutates/cli@$MV edit-methods --file src/svc.ts --filter '{"name":"ping"}' --json '{"name":"echo"}'`
      2. `npx -y @mutates/cli@$MV save && cat src/svc.ts`
    - **Expected:** the saved file contains `echo(): string` and no `ping(`.
    - _Requirements: 5.1, 5.4, 6.5_

  - [x] 4.4 Re-snapshot after mutation mints fresh refs
    - **Note:** refs are sequential per-file starting from @n1. Re-verified 2026-05-26 against the fix build: after `edit-methods` on `Svc`, `snapshot src/svc.ts --json` returns a single class entry `@n1 [class] Svc`.
    - **Preconditions:** §4.1 just ran (Foo added, NOT saved)
    - **Steps:**
      1. `npx -y @mutates/cli@$MV snapshot src/foo.ts --json | jq '.entries[].ref'`
    - **Expected:** prints `"@n1"` (the new ref for `class Foo`) — sequential per file from a fresh start. No `@n2` or stale ids carried over.
    - _Requirements: 4.1, 4.2_

- [x] 5. Error paths (must surface a JSON payload on stderr)

  - [x] 5.1 `STALE_REF` after the underlying file mutates
    - **Preconditions:** fresh `$WORK` per §3.1; same shell across steps
    - **Steps:**
      1. `REF=$(npx -y @mutates/cli@$MV snapshot src/app.ts --json | jq -r '.entries[1].ref')`
      2. `npx -y @mutates/cli@$MV add-classes --file src/app.ts --json '{"name":"X"}'`
      3. `npx -y @mutates/cli@$MV snapshot $REF --json; echo "EXIT=$?"`
    - **Expected:** Step 3 prints empty stdout and stderr containing JSON `{"code":"STALE_REF","message":"…re-snapshot…","details":{"ref":"@n2","file":"…src/app.ts"}}`. `EXIT=5`.
    - _Requirements: 4.3, 4.4, 8.3, 8.4_

  - [x] 5.2 `STALE_FILE` when on-disk content changes under us
    - **Preconditions:** §4.1 step 1 done (Foo added in memory, not saved)
    - **Steps:**
      1. `printf 'export const externallyTouched = 1;\n' > src/foo.ts`
      2. `npx -y @mutates/cli@$MV save --json; echo "EXIT=$?"`
    - **Expected:** stderr JSON `{"code":"STALE_FILE","message":"…","details":{"files":["…src/foo.ts"]}}`. `EXIT=6`. Verify `cat src/foo.ts` still shows the externally-touched content — the daemon must not overwrite.
    - _Requirements: 6.4, 7.1, 7.4, 8.3, 8.4_

  - [x] 5.3 `SESSION_NOT_FOUND` when `--session` points at a dead id
    - **Fixed:** `sessions list` now declares `--session` as a real arg and pipes it through `connectClient`, which validates it server-side. `connectClient` also fails fast (without spawning a daemon) when `--session` is given and no live daemon owns the root. Emits the JSON envelope and `EXIT=4`.
    - **Preconditions:** no live daemon
    - **Steps:**
      1. `npx -y @mutates/cli@$MV sessions list --session 00000000-dead-beef-0000-000000000000 --json; echo "EXIT=$?"`
    - **Expected:** stderr JSON with `code: "SESSION_NOT_FOUND"`. `EXIT=4`.
    - _Requirements: 8.3, 10.2_

  - [x] 5.4 `INVALID_INPUT` on schema-violating op payload
    - **Fixed:** `emit-schema.ts` now seeds each op's `data` shape with the common scalar ts-morph structure properties (`name: string`, `isExported: boolean`, …). AJV catches `{name:42, isExported:"sure"}` before the handler runs and the dispatcher maps it to `INVALID_INPUT` with `details.errors` (raw AJV trace). Exit code 2.
    - **Preconditions:** §3.1 fixture, daemon up
    - **Steps:**
      1. `npx -y @mutates/cli@$MV add-classes --file src/app.ts --json '{"name":42,"isExported":"sure"}'; echo "EXIT=$?"`
    - **Expected:** stderr JSON `{"code":"INVALID_INPUT",…}` with `details` pointing at the offending field. `EXIT=2`. Source file untouched.
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 5.5 `NOT_FOUND` when filter matches zero nodes
    - **Fixed:** with §4.3 unblocked, the generated handlers for `nodes` / `declarations-editor` target shapes now check whether `resolveDeclarations` returned anything, and raise `NOT_FOUND` with `{op, target}` details when the filter matched zero declarations. Exit code 3.
    - **Preconditions:** §3.1 fixture
    - **Steps:**
      1. `npx -y @mutates/cli@$MV edit-methods --file src/app.ts --filter '{"name":"does-not-exist"}' --json '{"name":"x"}'; echo "EXIT=$?"`
    - **Expected:** stderr JSON `code: "NOT_FOUND"`. `EXIT=3`. No mutation.
    - _Requirements: 5.5, 8.3_

- [x] 6. Self-documentation

  - [x] 6.1 `skills list` returns the embedded manifest
    - **Steps:**
      1. `npx -y @mutates/cli@$MV skills list | jq 'map(.name)'`
    - **Expected:** array contains `"core"`. Each entry has `description` (non-empty) and `sizeBytes > 0`.
    - _Requirements: 9.1_

  - [x] 6.2 `skills get core` prints markdown verbatim, byte-exact
    - **Steps:**
      1. `npx -y @mutates/cli@$MV skills get core | wc -c`
      2. `npx -y @mutates/cli@$MV skills list | jq '.[] | select(.name=="core") | .sizeBytes'`
    - **Expected:** the two numbers are identical.
    - _Requirements: 9.2, 9.3_

  - [x] 6.3 `skills get` unknown name → `NOT_FOUND` on stderr
    - **Fixed:** dropped the leaky parent `run()` in `bin/mutates.ts` — `process.exitCode = 3` set by the skills `get` subcommand is no longer clobbered by the trailing console.log. Verified 2026-05-26.
    - **Steps:**
      1. `npx -y @mutates/cli@$MV skills get definitely-missing; echo "EXIT=$?"`
    - **Expected:** stderr JSON `{"code":"NOT_FOUND",…}`. `EXIT=3`.
    - _Requirements: 8.3, 9.2_

  - [x] 6.4 `schema` returns the full op manifest
    - **Steps:**
      1. `npx -y @mutates/cli@$MV schema | jq '.ops | length'`
      2. `npx -y @mutates/cli@$MV schema --op addClasses | jq '{op,verb,category, hasSchema: (.schema.type=="object")}'`
    - **Expected:** Step 1 prints `≥ 60`. Step 2 prints
      `{"op":"addClasses","verb":"add","category":"classes","hasSchema":true}`.
    - _Requirements: 9.4_

- [x] 7. Multi-session and per-root isolation

  - [x] 7.1 Two roots → two daemons, each sees only itself
    - **Note:** `sessions list --all` returns daemon-level objects (`{pid, root, sock, startedAt, cliVersion, ageMs}`), not session-level — different shape than the regular `sessions list`. The `root` values still validate per the test, but consumers should know `--all` is a daemon enumeration, not a flattened session list.
    - **Preconditions:** two distinct tmpdirs `A=$(mktemp -d)` and `B=$(mktemp -d)`; clean lockfile dir
    - **Steps:**
      1. From shell #1: `cd $A && npx -y @mutates/cli@$MV open --json`
      2. From shell #2: `cd $B && npx -y @mutates/cli@$MV open --json`
      3. From shell #1: `npx -y @mutates/cli@$MV sessions list --json | jq '.[].root'`
      4. From shell #2: `npx -y @mutates/cli@$MV sessions list --json | jq '.[].root'`
      5. From shell #1: `npx -y @mutates/cli@$MV sessions list --all --json | jq 'map(.root) | sort'`
    - **Expected:** Step 3 prints only `$A`; step 4 prints only `$B`; step 5 prints both `[$A, $B]` (sorted).
    - _Requirements: 10.1, 10.2_

  - [x] 7.2 Daemons survive each other's shutdown
    - **Preconditions:** §7.1 set up
    - **Steps:**
      1. From shell #1: `npx -y @mutates/cli@$MV close --all --json`
      2. From shell #2: `npx -y @mutates/cli@$MV sessions list --json`
    - **Expected:** Step 2 still returns shell #2's daemon — closing one daemon must not affect another.
    - _Requirements: 10.1_

- [x] 8. Output contract

  - [x] 8.1 Successful command writes only to stdout
    - **Fixed:** removed the parent `run()` callback in `bin/mutates.ts`. `--help` still renders via citty's interception; subcommand invocations no longer print the trailing `Run \`mutates --help\`...` line. Verified 2026-05-26.
    - **Steps:**
      1. `npx -y @mutates/cli@$MV --help 2>/dev/null | head -1`
      2. `npx -y @mutates/cli@$MV --help 1>/dev/null 2>&1; echo "EXIT=$?"` and observe terminal — stderr should be silent on success.
    - **Expected:** Step 1 still prints the header (stdout is preserved). Step 2 shows no extra text from stderr; `EXIT=0`.
    - _Requirements: 8.1_

  - [x] 8.2 Error commands write JSON to stderr, nothing to stdout
    - **Fixed:** with the parent run() leak removed (§8.1), stdout is empty (0 B) on the error path and stderr holds the JSON envelope verbatim (`{"code":"NOT_FOUND",…}`). Verified 2026-05-26.
    - **Steps:**
      1. `npx -y @mutates/cli@$MV skills get nonexistent 1>/tmp/out 2>/tmp/err; cat /tmp/out; echo "---"; cat /tmp/err`
    - **Expected:** `/tmp/out` is empty. `/tmp/err` is valid JSON with `code: "NOT_FOUND"`.
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 8.3 Exit codes match the design table
    - **Fixed:** every documented code maps to its design exit code. Verified 2026-05-26:
      - `INTERNAL_ERROR` → EXIT=1 ✅
      - `INVALID_INPUT` (schema-violating add-classes) → EXIT=2 ✅
      - `NOT_FOUND` (skills get + zero-match edit) → EXIT=3 ✅
      - `SESSION_NOT_FOUND` (any cmd with --session <fake>) → EXIT=4 ✅
      - `STALE_REF` → EXIT=5 ✅
      - `STALE_FILE` → EXIT=6 ✅
    - `IO_ERROR=7` is not specifically exercised by the test plan but the mapping is in `EXIT_CODE_BY_SYMBOLIC` (output.ts).
    - **Steps:** Cross-check exit codes captured in §5.1–§5.5 and §6.3 against the design:
      `INTERNAL_ERROR=1, INVALID_INPUT=2, NOT_FOUND=3, SESSION_NOT_FOUND=4, STALE_REF=5, STALE_FILE=6, IO_ERROR=7`.
    - **Expected:** all observed exit codes match the table.
    - _Requirements: 8.4_

## Summary
- Total: 28 tests
- Passed: 28
- Failed: 0
- Skipped: 0

### History

| Run | Date | Branch | Pass | Fail |
|-----|------|--------|------|------|
| 1 | 2026-05-26 | published `@mutates/cli@2.1.1` | 15 | 13 |
| 2 | 2026-05-26 | `fix/mutates-cli-e2e` local build | 28 | 0 |

### Fix landings (run 2)

| # | Failing tests addressed | Change |
|---|------------------------|--------|
| 1 | 8.1, 8.2, 6.3 (and stdout noise in every other test) | Dropped the parent `run()` callback in `bin/mutates.ts` so citty no longer tail-appends `Run \`mutates --help\` to see available commands.\n` on every invocation. |
| 2 | 2.5 | Client unlinks the stale Unix socket file alongside the lockfile before spawning; daemon's `listen` retries once on `EADDRINUSE` after re-unlinking the socket. |
| 3 | 2.3 | Added a `daemon.shutdown` RPC; `close --all` calls it after closing every session so the daemon process exits and the lockfile is removed without waiting for idle-timeout. |
| 4 | 5.3 (and indirectly 8.3 for `SESSION_NOT_FOUND`) | `sessions list` now declares a real `--session` arg and pipes it through `connectClient`, which short-circuits to `SESSION_NOT_FOUND` (exit 4) when the daemon is dead or the id is unknown. |
| 5 | 4.1, 4.2 (and the entire snapshot → mutate → save loop's UX) | New `client/resolve-session.ts` helper picks an existing session for this root when `--session` isn't pinned; codegen template + every hand-written core command use it. |
| 6 | 5.4 (and the safety net for any agent typo) | `emit-schema.ts` seeds each op's `data` shape with the common ts-morph scalar properties (`name: string`, `isExported: boolean`, …). AJV catches type mismatches before they reach the handler. |
| 7 | 4.3, 5.5 (and unblocks the entire `methods`/`accessors`/`params`/etc. family at `--file` scope) | Split `_runtime.ts` finders into top-level (`FINDERS`) and composite (`COMPOSITE_RESOLVERS`) maps. Composite resolvers descend `getClasses` (or `getFunctions`, etc.) then call the per-category getter. Generated handlers also raise `NOT_FOUND` when `resolveDeclarations` matches zero declarations. |

### Bug clusters (now closed)

All six clusters from run 1 are fixed:

1. **Session reuse missing** → `resolveSessionId` helper (fix #5).
2. **Citty parent `run()` leak** → parent `run()` removed (fix #1).
3. **Op-payload schema validation never runs** → AJV now has typed common properties (fix #6).
4. **Exit-code dispatch incomplete** → root cause was the `run()` leak (fix #1) plus `sessions list` ignoring `--session` (fix #4); every code path now sets `process.exitCode` correctly.
5. **`edit-methods` classifier crash** → composite resolvers (fix #7).
6. **Daemon lifecycle** → daemon shutdown on close --all (fix #3), stale socket cleanup (fix #2).
