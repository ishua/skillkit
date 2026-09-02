# skillkit

skillkit holds the **source** of Agent Skills. It is a development repo, not a
workspace for trying skills out. Skills here are installed on other machines,
by other people, so every skill is written so a stranger can install and run
it.

## Layout

A skill uses the shared-root + `platforms/` layout. Shared content lives once
at `skills/<name>/`; only harness-specific code, bundles, and install metadata
live under `skills/<name>/platforms/<harness>/`.

    skills/<name>/
    ├── SKILL.md               # shared, harness-agnostic
    ├── VERSION                # single line, e.g. "0.1.0"
    ├── CHANGELOG.md           # per-skill changelog (Keep a Changelog)
    ├── scripts/               # shared helper scripts
    ├── references/            # shared reference docs
    ├── assets/                # shared templates and fixtures
    └── platforms/
        ├── opencode/          # src, dist, install manifest, README
        ├── claude-code/       # (future)
        └── pi/                # (future)

Other root files:

- `scripts/release.sh` — release automation for any skill
- `package.json` — root workspace manifest (bun workspaces)
- `docs/design/versioning-and-install.md` — the versioning and install design
- `AGENTS.md` — guidance for agents and contributors

## Skills

| Skill  | What it does                                             | Harness support |
|--------|----------------------------------------------------------|-----------------|
| `notes`| Routes captured findings into per-project outboxes       | opencode        |
| `focus`| Consolidates tasks from configured sources into one list | markdown-only   |

- `notes` is a TypeScript plugin installed via a declarative manifest.
- `focus` is a markdown-only skill invoked explicitly via `/skill:focus` and
  needs no build.

## Install

Install is per-skill and per-harness. Each harness a skill supports has an
install guide at `skills/<name>/platforms/<harness>/README.md` plus an
`install-manifest.txt` describing the file copies. For example, the opencode
install for the notes skill:

    skills/notes/platforms/opencode/README.md

Follow that skill's `README.md`: copy files per its manifest, then set up any
user-specific config. The repo ships a `.example.json` template that you copy
to the real config file and fill in.

## Versioning

Each skill is versioned independently. Its version lives in `VERSION` (SemVer
`X.Y.Z`), its changes in `CHANGELOG.md`, and releases are tagged
`<name>/vX.Y.Z`. Releases are driven by `scripts/release.sh`:

    scripts/release.sh <skill> [patch|minor|major] [--dry-run]

See `docs/design/versioning-and-install.md` for the full model.

## Workspace

The root `package.json` configures bun workspaces over `skills/*/platforms/*/`
so all platform packages resolve together. Run `bun install` at the root and
commit `bun.lock`. Compiled bundles are committed under
`platforms/<harness>/dist/` so installed skills run without a local toolchain.
