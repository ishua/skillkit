# Architecture: finding capture during working sessions

*Original design notes in Russian were excluded per repo policy.*

## Problem

During work across different projects and sessions, a harness agent periodically
stumbles on incidental findings — tasks, bugs, ideas — unrelated to the task at
hand. The agent needs a fast way to record such a finding without leaving the
current session, routing it automatically to the right project.

## General idea

Two independent, loosely coupled components:

1. **The skill** — a thin dispatcher. It knows nothing about how findings are
   stored; it only knows about the project registry and a universal call
   protocol.
2. **The project API contract** — a pair of executable scripts (`conf/list`,
   `conf/add_task`) that every project wishing to accept findings must
   implement. Storage format and implementation language are entirely up to the
   project.

The skill must not know anything about source aliases — that is the project's
responsibility, relayed through `conf/list`.

## Component 1: the skill

### Registry (skill config)

Stored alongside the skill (not inside projects). A list of known projects:
the path to each project root plus a default-project flag.

```json
{
  "notes": { "root": "/path/to/notes", "default": true },
  "catalog-api": { "root": "/path/to/catalog-api" }
}
```

- `root` — the project root; API scripts are located at the fixed relative
  paths `conf/list` and `conf/add_task` beneath it.
- `default: true` — exactly one project in the registry is marked default. It
  receives a finding when no alias matches.

### Finding-handling algorithm

1. The skill receives a finding: `date`, `source`, `text`.
2. The skill iterates over all projects in the registry, calling each one's
   `<root>/conf/list` (no arguments).
3. Each `list` returns JSON with the list of source aliases that project is
   willing to accept.
4. The skill matches the finding's `source` against the collected aliases.
   Implemented as substring matching: if at least one alias of a project is a
   substring of `source`, that project is considered the owner. Projects are
   checked in registry order — first match wins. Caveat: a short alias (e.g.
   `/foo`) can also match an unrelated path (`/foobar`); aliases are expected to
   be specific enough that this is not a problem in practice.
5. If an owning project is found, the skill calls its `<root>/conf/add_task`,
   passing the finding over stdin as JSON.
6. If no alias matches, `add_task` is called on the project flagged
   `default: true`.

The decision to call `list` afresh for every finding (rather than caching within
a session) was settled during implementation: with only a handful of projects it
is not worth the complexity, so routing starts "no cache".

## Component 2: the project API contract

Each participating project contains a `conf/` directory with two executable
files. No extensions, with a shebang, `chmod +x`. The implementation language
is irrelevant to the skill — it simply executes the file.

```
<project-root>/
  conf/
    list        # executable, no arguments
    add_task    # executable, reads JSON from stdin
```

### `conf/list`

Called with no arguments. Prints JSON to stdout:

```json
{
  "aliases": ["/catalog-api/", "/worktree/catalog-api"]
}
```

The alias list is used by the skill only to match the source; it is neither
stored nor interpreted elsewhere.

### `conf/add_task`

Receives the finding over stdin as JSON:

```json
{
  "date": "2026-08-26",
  "source": "/path/to/catalog-api/handlers",
  "text": "found that a timeout is hard-coded in config"
}
```

What the project does with the record is entirely its own concern. The skill
expects no specific output, only an exit code (`0` for success).

## Example: how it is implemented inside `notes` (the default project)

This is the internal implementation of a specific `notes` project; it concerns
neither the skill nor the API contract — it is just an example of what can sit
behind `add_task`.

```
notes/
  conf/
    list          # returns the aliases of sources known to the notes project
    add_task      # files the finding into inbox/
  inbox/
    common.md     # findings not tied to a specific sub-project/service
    <slug>.md     # findings for a specific sub-project/service
```

The record format inside any `inbox/` file is uniform; findings are appended to
the end of the file:

```
- 2026-08-26 · /path/to/catalog-api/handlers · found that a timeout is hard-coded in config
```

`source` is kept in the record text even in `common.md` so accumulated entries
can later be split across sub-projects by hand.

The `notes` `conf/list` and `conf/add_task` are implemented in Python, in line
with the other scripts in this repository's `src/`.

Parsing `inbox/` (how and when findings become tasks or reach `weekly/`) is
intentionally not designed here. The decision is deferred until a real finding
flow builds up and shows which parsing pattern is most convenient.

## Open questions

### Resolved during implementation

- Alias-matching mechanics — **resolved**: substring search
  (`source.includes(alias)`), first-match-wins in registry order.
- Whether to cache `list` results within a session — **resolved**: no cache,
  `list` is called again for every finding (a handful of projects at current
  scale; a per-call timeout guards against hangs).
- Error/logging format when `add_task` fails — **resolved**: the tool returns
  `Failed to route finding to <project>` (or `No project available in registry`
  when no target is found); no logging, errors are surfaced in the tool
  response.

### Still open

- The `notes` `inbox/` parsing process (once more data accumulates).
