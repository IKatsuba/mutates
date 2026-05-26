# @mutates/cli

AST mutation CLI for AI agents. `mutates` is a thin client over
`@mutates/core`; a per-project daemon owns a single `ts-morph` `Project`,
mints opaque `@nN` node refs, applies structural edits in memory, and
saves with mtime+size conflict detection.

## Install

```sh
npm i -g @mutates/cli
```

This puts a `mutates` binary on your `PATH`. No project-local install is
required; the CLI operates against the current working directory by
default, or against an explicit project root via `--root <path>`.

## The loop: snapshot → act → save

Every interaction follows the same three steps. Snapshots mint refs;
acts (mutation ops) invalidate those refs; saving flushes to disk if no
on-disk file has changed since the daemon loaded it.

```sh
# 1. Snapshot a file to discover its top-level shape and mint refs.
mutates snapshot src/app.ts

#    Output (text mode):
#      @n1  ImportDeclaration  from 'fastify'
#      @n2  ClassDeclaration   AppController  [exported]
#      @n3  FunctionDeclaration bootstrap     [exported, async]

# 2. Act. Pass the structure payload as JSON.
mutates add-methods --target @n2 \
  --json '{"name":"ping","returnType":"string","statements":["return \"pong\";"]}'

# 3. Inspect what changed.
mutates diff

# 4. Save (or `--dry-run` first to preview the write set).
mutates save
```

Every command honours `--json` for machine-readable output. Errors land
on stderr as JSON `{ code, message, details }`; the exit code maps to
the error category (`STALE_REF` → 5, `STALE_FILE` → 6, etc.). See
`mutates schema` and `mutates skills get core` for the full surface.

### Sessions

A daemon spawns automatically on the first command for a given root and
shuts itself down after 10 minutes of idle (`MUTATES_IDLE_TIMEOUT=<ms>`
to override). Explicit lifecycle commands exist too:

```sh
mutates open                      # eager spawn
mutates sessions list             # daemons for cwd
mutates sessions list --all       # every live daemon on this host
mutates close --all               # stop everything
```

### Staleness

- `STALE_REF` — a ref was invalidated by a mutation; re-snapshot the
  file and try again.
- `STALE_FILE` — a file on disk changed since the daemon loaded it; run
  `mutates reload <file>` (which drops in-memory edits for that file)
  or close the session and start over.

## Discovering ops

`mutates schema` returns the JSON Schema for every generated operation
— `add-classes`, `edit-methods`, `remove-decorators`, … — covering every
exported `add* / edit* / remove* / get*` function on `@mutates/core`.

```sh
mutates schema                    # full manifest, every op
mutates schema add-classes        # one op's payload shape
mutates --help                    # tree of commands
```

## Agent guide

`mutates skills get core` returns a single Markdown document that walks
an agent through the snapshot → act → save loop, common patterns, and
the full troubleshooting tree for `STALE_REF` / `STALE_FILE`. It is the
canonical starting point when wiring `mutates` into a new agent
runtime.

```sh
mutates skills list
mutates skills get core
```

## Multi-session

Multiple project roots run independent daemons. Every command except
`open`, `close --all`, `sessions list`, and `skills *` accepts
`--session <id>` to target a specific session; the default is the
session bound to the project root resolved from `--root` / cwd
(Req 10.1, 10.2).

## License

Apache-2.0. See [LICENSE](../../LICENSE).
