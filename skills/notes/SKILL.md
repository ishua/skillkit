---
name: notes
description: |-
  Captures findings (tasks, bugs, ideas) that come up during a working session and routes them into the right project outbox so nothing gets lost.
  Use when the user asks to save a note or a finding with phrases like «добавь в заметки», «note it down», «add note», «запиши в заметки», or similar — spoken mid-session, unrelated to the code you are currently writing.

  Use cases:
  - User: "добавь в заметки: подумать про ретраи в каталоге" → capture_finding
  - User: "note it down: catalog uses stale cache invalidation" → capture_finding
  - User asks to manage the project registry → add_project / remove_project / list_projects
---

# Notes — Finding Capture

<critical>
The skill is a thin dispatcher. It never decides where a finding belongs on its own; it matches the current working directory against each project's own `conf/list` aliases and lets the project record the finding via its `conf/add_task` contract. Do not try to re-implement routing logic in prose — just call the tools below.
</critical>

## What the plugin provides

The plugin auto-loads as an OpenCode plugin and exposes four tools to the agent:

| Tool | Purpose | Key Args |
|------|---------|----------|
| `capture_finding` | Route a finding to the best-matching project and record it there | `text` (required) |
| `add_project` | Register a project as a routing target | `name`, `root`, `default?` |
| `remove_project` | Deregister a project | `name` |
| `list_projects` | Show the project registry | none |

How `capture_finding` works: it reads the project registry, invokes each project's
`conf/list` to learn its accepted source aliases, and routes the finding to the
first project whose alias is a substring of the current working directory
(projects are checked in registry order — first match wins). If no project
matches, it falls back to the registry's default project. The finding is
delivered to the target's `conf/add_task` as `{ "date", "source", "text" }`.

Cleartext errors the tool may return:

- `No project available in registry` — the registry is empty or no project's
  alias matched and no default project is configured.
- `Failed to route finding to <project>` — the target project's `conf/add_task`
  exited non-zero or could not be executed.
- `Finding routed to <project>` — success.

## Project API contract

Every project that wants to receive findings provides two executable scripts
under its registry `root` (as returned by `conf/list`):

```
<root>/conf/list        # no args; prints JSON {"aliases": ["..."]} to stdout
<root>/conf/add_task    # reads {"date","source","text"} JSON from stdin
```

- `conf/list` prints a JSON object whose `aliases` array lists the source
  prefixes/segments the project accepts. Aliases are matched against the
  current working directory as substrings. Keep aliases specific — a short
  alias (e.g. `/foo`) can also match an unrelated path (`/foobar`).
- `conf/add_task` is expected to record the finding and exit `0` on success.
  Any non-zero exit (or failure to start) is treated as a routing failure.

The storage format is entirely the project's concern; the skill only relays the
request. A reference implementation lives inside the default `notes` project.

## Recognition

These trigger patterns signal a note/finding-capture intent:

- Russian: «добавь в заметки», «запиши в заметки», «запомни: …», «заметка: …»
- English: "note it down", "add note", "jot this down", "note: …"

> **Trigger language note.** Trigger phrases are deliberately multilingual;
> they are functional, user-facing patterns and must match the languages real
> users speak. The repo's English-only rule applies to documentation prose, not
> to these trigger patterns. Keep them as-is.

A trigger is a request to *save information*, distinct from editing the current
codebase. When in doubt whether the user wants a saved note or a real task to act
on now, ask a one-line clarification.

## Agent instructions

1. **Recognize the trigger** — the user asks to save a note/finding (multiple languages, see above).
2. **Determine the text** — the content to capture, stripping the trigger phrase itself.
   - Captured as spelled by the user; keep it concise but preserve the meaning.
   - If the text is ambiguous or the target project is unclear, ask the user to clarify before calling `capture_finding`.
3. **Call `capture_finding(text)`** with the captured text as the single `text` argument.
4. **Report the result** — relay the tool's message (e.g. "Finding routed to `<project>`") or the error to the user.

Use `add_project` / `remove_project` / `list_projects` only when the user explicitly manages the registry.

### Example

- **User:** "добавь в заметки: проверить таймауты в консьюмере"
- **Agent:** calls `capture_finding(text = "проверить таймауты в консьюмере")`
- **Result:** `Finding routed to catalog-api` → agent reports: "Сохранено в catalog-api."

## How to save (short form)

1. Detect the trigger phrase.
2. Pass the finding text to `capture_finding`.
3. Confirm to the user which project received it.

## Registry

The runtime registry lives at `registry.json` in the skill's install location.
At install time `registry.example.json` is copied to `registry.json` and filled
in with real project paths (see the opencode install instructions). Shape:

```json
{
  "example-project": { "root": "/path/to/project", "default": true }
}
```

## Installation

Refer to `platforms/opencode/README.md` for the opencode install steps. Install
is manifest-driven: files are copied into the harness config directory per
`platforms/opencode/install-manifest.txt`. The skill version lives in `VERSION`
at the skill root.
