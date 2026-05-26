---
status: APPROVED
created: 2026-05-26
updated: 2026-05-26
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

  - [!] 2.3 `close --all` stops the daemon and removes the lockfile
    - **FAILED:** `close --all` returned `{"closed":["<sessionId>"]}` but daemon process (PID 48000) stayed alive and lockfile `38d519b4eab3fb92.json` persisted. `sessions list --json` confirms zero logical sessions, yet the daemon does not self-terminate when its last session closes — it waits for idle-timeout instead. Either the implementation should exit the daemon when the last session closes, or the test plan / Req 2.3, 2.7 should be reworded to expect timeout-driven shutdown rather than immediate.
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

  - [!] 2.5 Stale lockfile after kill -9 → next command respawns
    - **FAILED:** after `kill -9 <daemonPid>` the lockfile is left behind. The next `sessions list --json` does not detect the stale lockfile, attempts to connect to the dead socket, fails to spawn, and errors with `{"code":"INTERNAL_ERROR","message":"mutates daemon did not start within 2000ms"}`. Exit 1. Recovery is manual (`rm` the lockfile). Implementation should drop a lockfile whose `pid` is no longer alive (or whose socket is unreachable) and respawn fresh.
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

- [!] 4. Mutation → save round-trip

  - [!] 4.1 `add-classes` mutates in memory and `save` writes to disk
    - **FAILED:** each CLI invocation opens a fresh session by default, so subsequent commands (`diff`, `save`, `snapshot`) cannot see prior mutations without an explicit `--session <id>`. Reproduction: `add-classes --file src/foo.ts --json '{"name":"Foo","isExported":true}'` returns `{ok:true,mutated:[…]}`, but the very next `diff` (no `--session`) prints nothing and `list-files --json` reports `dirty:false`. `sessions list --json` then shows multiple sessions for the same root, only the first carrying `unsavedFiles:1`. Passing `--session <id>` works (diff renders the class, save writes it). The documented daily contract (snapshot → mutate → save) is broken across invocations. Fix: CLI should resolve "open session for cwd" implicitly, or `open` should pin a default. The session-reuse issue cascades into 4.2, 4.3, 4.4 and §5.1.
    - **Preconditions:** fresh `$WORK` with `src/foo.ts` containing `export {};\n`
    - **Steps:**
      1. `npx -y @mutates/cli@$MV add-classes --file src/foo.ts --json '{"name":"Foo","isExported":true}'`
      2. `npx -y @mutates/cli@$MV diff` (peek the diff before save)
      3. `npx -y @mutates/cli@$MV save --json`
      4. `cat src/foo.ts`
    - **Expected:** Step 1 returns `{"ok":true,"mutated":["…src/foo.ts"]}`. Step 2 shows a unified diff including `+ export class Foo {}`. Step 3 returns `{"written":["…src/foo.ts"]}`. Step 4 shows the new class on disk.
    - _Requirements: 5.1, 5.4, 6.1, 6.3, 6.5_

  - [!] 4.2 `save --dry-run` writes nothing
    - **FAILED:** transitively blocked by §4.1 (no auto-session). When run with `--session <id>` explicitly, `save --dry-run --json` correctly returns `{"wouldWrite":[{"file":"…","bytes":32}]}` and leaves disk untouched, so the underlying dry-run logic is intact.
    - **Preconditions:** §4.1 step 1 done, step 2 not yet run
    - **Steps:**
      1. `npx -y @mutates/cli@$MV save --dry-run --json`
      2. `cat src/foo.ts`
    - **Expected:** Step 1 returns `{"wouldWrite":[{"file":"…src/foo.ts","bytes":…}]}`. Step 2 still shows the original `export {};` — no disk write.
    - _Requirements: 6.2_

  - [!] 4.3 `edit-methods` works on a class located via filter
    - **FAILED:** `edit-methods --file src/svc.ts --filter '{"name":"ping"}' --json '{"name":"echo"}'` returns `{"code":"INTERNAL_ERROR","message":"node?.getKind is not a function"}` and the subsequent `save` writes nothing. The methods classifier doesn't resolve a bare method-name filter on a source file — it requires the enclosing class context. Either CLI should descend into classes automatically when `edit-methods --file` is used, or the documented usage in skills/help needs to spell out the class-first walk.
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
    - **Note:** refs are sequential per-file starting from @n1; in this fixture the existing `export {};` is @n1 and Foo is @n2. The test plan's expectation of `@n1` for Foo misread the fixture but the intent (deterministic sequential refs from a fresh start) holds.
    - **Preconditions:** §4.1 just ran (Foo added, NOT saved)
    - **Steps:**
      1. `npx -y @mutates/cli@$MV snapshot src/foo.ts --json | jq '.entries[].ref'`
    - **Expected:** prints `"@n1"` (the new ref for `class Foo`) — sequential per file from a fresh start. No `@n2` or stale ids carried over.
    - _Requirements: 4.1, 4.2_

- [!] 5. Error paths (must surface a JSON payload on stderr)

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

  - [!] 5.3 `SESSION_NOT_FOUND` when `--session` points at a dead id
    - **FAILED:** `sessions list --session <fake>` returns `[]` with `EXIT=0` (no error). `snapshot <file> --session <fake>` does emit `{"code":"SESSION_NOT_FOUND",…}` on stderr but the process exits 0, not the expected `EXIT=4`. Exit-code mapping for `SESSION_NOT_FOUND` is missing; `sessions list` should validate explicit session ids instead of silently filtering to empty.
    - **Preconditions:** no live daemon
    - **Steps:**
      1. `npx -y @mutates/cli@$MV sessions list --session 00000000-dead-beef-0000-000000000000 --json; echo "EXIT=$?"`
    - **Expected:** stderr JSON with `code: "SESSION_NOT_FOUND"`. `EXIT=4`.
    - _Requirements: 8.3, 10.2_

  - [!] 5.4 `INVALID_INPUT` on schema-violating op payload
    - **FAILED:** `add-classes --json '{"name":42,"isExported":"sure"}'` is silently accepted (`{ok:true,mutated:[…]}`, EXIT=0) and produces invalid TypeScript `export class { }` in the in-memory file. No JSON Schema validation runs on op payloads before they hit the handler. Either AJV validation should kick in (the schemas exist — verified via §6.4) or the handlers need to fail closed.
    - **Preconditions:** §3.1 fixture, daemon up
    - **Steps:**
      1. `npx -y @mutates/cli@$MV add-classes --file src/app.ts --json '{"name":42,"isExported":"sure"}'; echo "EXIT=$?"`
    - **Expected:** stderr JSON `{"code":"INVALID_INPUT",…}` with `details` pointing at the offending field. `EXIT=2`. Source file untouched.
    - _Requirements: 8.2, 8.3, 8.4_

  - [!] 5.5 `NOT_FOUND` when filter matches zero nodes
    - **FAILED:** the same classifier bug as §4.3 kicks in before NOT_FOUND can be considered. `edit-methods --file src/app.ts --filter '{"name":"does-not-exist"}'` returns `{"code":"INTERNAL_ERROR","message":"node?.getKind is not a function"}` with `EXIT=0`. NOT_FOUND path is unreachable for `edit-methods` on a source-file scope until the classifier is fixed.
    - **Preconditions:** §3.1 fixture
    - **Steps:**
      1. `npx -y @mutates/cli@$MV edit-methods --file src/app.ts --filter '{"name":"does-not-exist"}' --json '{"name":"x"}'; echo "EXIT=$?"`
    - **Expected:** stderr JSON `code: "NOT_FOUND"`. `EXIT=3`. No mutation.
    - _Requirements: 5.5, 8.3_

- [!] 6. Self-documentation

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

  - [!] 6.3 `skills get` unknown name → `NOT_FOUND` on stderr
    - **FAILED:** `{"code":"NOT_FOUND","message":"unknown skill \"definitely-missing\""}` JSON is emitted (good), but `EXIT=0` instead of `EXIT=3`. Same exit-code-mapping gap as §5.3 and §5.5: error JSON goes out, exit code stays at 0.
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

- [!] 8. Output contract

  - [!] 8.1 Successful command writes only to stdout
    - **FAILED:** parent citty `run()` is invoked alongside the dispatched subcommand, so every command tail-appends `Run \`mutates --help\` to see available commands.\n` to stdout. For `--help` it's visually appended to the help block (stdout=9574 bytes); for JSON commands it tags a non-JSON trailer onto otherwise machine-readable output. Subcommand-handled invocations should suppress the root `run()`.
    - **Steps:**
      1. `npx -y @mutates/cli@$MV --help 2>/dev/null | head -1`
      2. `npx -y @mutates/cli@$MV --help 1>/dev/null 2>&1; echo "EXIT=$?"` and observe terminal — stderr should be silent on success.
    - **Expected:** Step 1 still prints the header (stdout is preserved). Step 2 shows no extra text from stderr; `EXIT=0`.
    - _Requirements: 8.1_

  - [!] 8.2 Error commands write JSON to stderr, nothing to stdout
    - **FAILED:** stderr correctly carries `{"code":"NOT_FOUND",…}` (63 B). stdout is non-empty (48 B) — same `Run \`mutates --help\`…` trailer from the parent `run()` leaks even on the error path, breaking the "stdout silent on error" contract.
    - **Steps:**
      1. `npx -y @mutates/cli@$MV skills get nonexistent 1>/tmp/out 2>/tmp/err; cat /tmp/out; echo "---"; cat /tmp/err`
    - **Expected:** `/tmp/out` is empty. `/tmp/err` is valid JSON with `code: "NOT_FOUND"`.
    - _Requirements: 8.1, 8.2, 8.3_

  - [!] 8.3 Exit codes match the design table
    - **FAILED:** observed mapping vs design (`INTERNAL_ERROR=1, INVALID_INPUT=2, NOT_FOUND=3, SESSION_NOT_FOUND=4, STALE_REF=5, STALE_FILE=6, IO_ERROR=7`):
      - `STALE_REF` → EXIT=5 ✅
      - `STALE_FILE` → EXIT=6 ✅
      - `INTERNAL_ERROR` → EXIT=1 ✅
      - `NOT_FOUND` (skills get) → EXIT=0 ❌ (expected 3)
      - `SESSION_NOT_FOUND` (snapshot --session fake) → EXIT=0 ❌ (expected 4)
      - `INVALID_INPUT` (schema-violating add-classes) — N/A because validation didn't run; payload was accepted, see §5.4.
    - Exit-code mapping is partial; the dispatcher needs to translate `NOT_FOUND` and `SESSION_NOT_FOUND` errors into their corresponding non-zero exit codes (and validation must run to surface `INVALID_INPUT` in the first place).
    - **Steps:** Cross-check exit codes captured in §5.1–§5.5 and §6.3 against the design:
      `INTERNAL_ERROR=1, INVALID_INPUT=2, NOT_FOUND=3, SESSION_NOT_FOUND=4, STALE_REF=5, STALE_FILE=6, IO_ERROR=7`.
    - **Expected:** all observed exit codes match the table.
    - _Requirements: 8.4_

## Summary
- Total: 28 tests
- Passed: 15
- Failed: 13
- Skipped: 0

### Failures roll-up

| # | Test | Root cause |
|---|------|------------|
| 2.3 | `close --all` stops the daemon | Daemon stays alive on last-session close; only idle-timeout shuts it down. |
| 2.5 | Stale lockfile recovery | Dead-pid lockfile not pruned; client times out trying to reach old socket. |
| 4.1 | add-classes → save round-trip | No implicit per-root session reuse: each invocation gets a fresh session, mutations invisible to next command. |
| 4.2 | save --dry-run | Transitively broken by 4.1 (underlying dry-run logic works under `--session`). |
| 4.3 | edit-methods filter | Method classifier crashes when filtering by name at source-file scope (`node?.getKind is not a function`). |
| 5.3 | SESSION_NOT_FOUND | `sessions list --session <fake>` returns `[]` instead of erroring; `snapshot --session <fake>` emits JSON but EXIT=0. |
| 5.4 | INVALID_INPUT | Op-payload schema validation doesn't run; invalid `{name:42,…}` is accepted and yields invalid TS. |
| 5.5 | NOT_FOUND on zero match | Blocked by same classifier crash as 4.3. |
| 6.3 | skills get unknown | JSON error correct, EXIT=0 instead of 3. |
| 8.1 | stdout silent on success | Parent citty `run()` leaks `Run \`mutates --help\`...` trailer onto every invocation. |
| 8.2 | stderr-only on error | Same trailer pollutes stdout on errors. |
| 8.3 | Exit-code table | NOT_FOUND / SESSION_NOT_FOUND / INVALID_INPUT mappings missing. |
| 4. / 5. / 6. / 8. (group rollups) | Marked `[!]` because any contained test failed. |

### Bug clusters

1. **Session reuse missing** — 4.1, 4.2, transitively most of §5 require `--session <id>` to even reproduce intended behavior.
2. **Citty parent `run()` leak** — 8.1, 8.2, plus noise in every passing test's stdout.
3. **Op-payload schema validation never runs** — 5.4, masks NOT_FOUND in 5.5.
4. **Exit-code dispatch incomplete** — 5.3, 5.4, 5.5, 6.3, 8.3 all touch the same gap.
5. **Classifier crash on `edit-methods --file ... --filter name`** — 4.3, 5.5 (same root cause as the pre-existing `getMethods`/`getAccessors` enclosing-class issue noted in the mvp summary).
6. **Daemon lifecycle** — 2.3 (no shutdown on last close), 2.5 (no stale-lockfile recovery).
