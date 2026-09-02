# Versioning & Install Model

This document is the design for how skills in this repository are versioned,
built, and installed. It establishes the shared-root + `platforms/` layout and
the declarative install model that every skill follows.

## 1. Shared-root + platforms/ layout rationale

A skill is a single logical unit that may have multiple harness-specific
implementations (opencode, Claude Code, pi). Harnesses share most content —
the `SKILL.md`, reference docs, and helper scripts are identical. Only the
install destination, any bundled runtime (TypeScript plugin, compiled asset),
and per-harness configuration differ.

To avoid duplicating the shared content for every harness, a skill is laid out
with a **shared root** and one **platform directory per harness**:

```
skills/<name>/
├── SKILL.md               # shared, harness-agnostic
├── VERSION                # single line, e.g. "0.1.0"
├── CHANGELOG.md           # per-skill changelog (Keep a Changelog)
├── scripts/               # shared shell scripts (harness-agnostic)
├── references/            # shared reference docs
├── assets/                # shared templates/fixtures
└── platforms/
    ├── opencode/
    │   ├── src/                 # harness-specific source (TS plugin)
    │   ├── dist/                # committed bundle (index.js)
    │   ├── package.json         # workspace member, harness deps
    │   ├── tsconfig.json
    │   ├── install-manifest.txt # source→dest mapping
    │   └── README.md            # install instructions for this harness
    ├── claude-code/             # (future)
    └── pi/                      # (future)
```

Rationale:

- **Common files live once.** `SKILL.md`, `scripts/`, `references/`, `assets/`
  sit at the skill root. Adding a new harness never copies shared content.
- **Harness differences are isolated** under `platforms/<harness>/`. This keeps
  install-location and build differences out of the shared root and out of the
  `SKILL.md`, matching the repository `AGENTS.md` guidance that harness
  differences live in install scripts, not in skill content.
- **A harness may have no platform directory yet.** Only harnesses with a real
  implementation get a directory; porting a skill across harnesses is additive.

## 2. Per-skill versioning

Each skill carries its own independent version. Versions never live at the
repository root; different skills evolve on different cadences and are consumed
(and installed) independently.

### `VERSION`

- Location: `skills/<name>/VERSION`.
- Content: a single line with no whitespace beyond the trailing newline.
  Format: `X.Y.Z` (SemVer 2.0.0). Example: `0.1.0`.
- This is the canonical source of truth for a skill's version. Any per-platform
  `package.json` keeps its `version` field in sync with this file.

### `CHANGELOG.md`

- Location: `skills/<name>/CHANGELOG.md`.
- Format: Keep a Changelog 1.1.0 + SemVer 2.0.0.
- `## [Unreleased]` is always present. On release it is renamed to a dated
  heading and a fresh empty `## [Unreleased]` is inserted above it.

### Namespaced git tags

- Tags are namespaced by skill name so a single repo can hold many skills
  without tag collisions: `<skill-name>/vX.Y.Z`.
- Examples: `notes/v0.1.0`, `focus/v1.2.0`.
- Tagging is performed by `scripts/release.sh`, never by hand.

## 3. `scripts/release.sh`

A single shared script at the repository root automates releasing any skill.

### Usage

```
scripts/release.sh <skill> [patch|minor|major] [--dry-run]
```

### Behavior

1. Reads `skills/<skill>/VERSION` (single line, strips surrounding whitespace).
2. Validates the version is SemVer `X.Y.Z`; exits with an error otherwise.
3. Bumps the version according to the requested type (`patch`, `minor`, or
   `major`).
4. Transforms `skills/<skill>/CHANGELOG.md`:
   - renames `## [Unreleased]` → `## [X.Y.Z] — YYYY-MM-DD`;
   - inserts a fresh `## [Unreleased]` section (with its sub-headers) above it;
   - preserves any content below the `---` separator.
5. Writes the new version back to `skills/<skill>/VERSION`.
6. Performs git operations (production mode only):
   - `git add skills/<skill>/VERSION skills/<skill>/CHANGELOG.md`;
   - `git commit -m "chore(<skill>): release vX.Y.Z"`;
   - `git tag -a <skill>/vX.Y.Z -m "Release <skill>/vX.Y.Z"`.
7. Refuses to run on anything other than the default branch (`main` or
   `master`); releases on any other branch are rejected before any git
   operation.

### `--dry-run`

When `--dry-run` is passed, the script prints the resulting version (old →
new) and the changelog transformation, and **modifies nothing** — no file
writes, no `git add`, no commit, no tag. It is used to preview and validate a
release without side effects.

## 4. Declarative install

Installation is declarative: each platform directory carries an
`install-manifest.txt` describing which files go where, plus a `README.md` with
human instructions. An agent (or the maintainer) reads the manifest and copies
files into place. There is no heavy install script that runs at startup.

### `install-manifest.txt` format

- One entry per line: `<source>::<dest>[::<mode>]`.
- `<source>` is relative to the manifest file's own directory, i.e.
  `platforms/<harness>/`. Shared files at the skill root are referenced with
  `../../`; local files are referenced directly (e.g. `dist/index.js`).
- `<dest>` is relative to the harness config dir base (see below).
- `<mode>` is optional: `overwrite` (default) or `if-missing`.
  - `overwrite` — always copy source over dest.
  - `if-missing` — copy/rename source to dest only if dest does not already
    exist; if it exists, leave it untouched. Use this for user-edited files
    (e.g. a registry template renamed into place on first install) so a
    re-install never clobbers configured data.
- Blank lines and `#`-prefixed comment lines are ignored.

Example:

```
# Install manifest for the notes skill (opencode platform)
../../SKILL.md::skill/notes/SKILL.md
dist/index.js::plugins/notes.js
../../VERSION::skill/notes/VERSION
registry.example.json::skill/notes/registry.json::if-missing
```

### Harness config dir base

The destination root is the harness's configuration directory:

- opencode: `~/.config/opencode/` (overridable via `OPENCODE_CONFIG_DIR`).
- Other harnesses use their own config dir base; the difference is documented
  in each platform `README.md`, not in shared content.

### User-specific configuration

User-specific settings (e.g. a note-taking registry mapping project names to
paths) are never committed. The repository ships a `.example` template (for
example `registry.example.json`) with placeholder values; at install time the
user copies it to a real config file and fills in their values. This matches
the repository's `config.example.json` / untracked `config.json` rule.

## 5. Dist policy: committed bundles

Users install a skill on another machine and generally do not build from
source. To make that work, built bundles are **committed** to the repository:

- Compiled output lives at `platforms/<harness>/dist/` (for example
  `dist/index.js`).
- The root `.gitignore` ignores `dist/` globally, so a negation exception is
  required to keep committed bundles tracked:
  `!skills/*/platforms/*/dist/`.
- Because the bundle is committed, an installed skill runs without a local
  toolchain, and the installed copy is a plain file copy (no symlinks).

Source of truth for the bundle is the build command, which is documented in the
platform `package.json` and `README.md`. The build command lives at the skill
root, for example:

```
bun build platforms/opencode/src/index.ts --outdir platforms/opencode/dist --target bun
```

## 6. Workspace setup

The repository root has a `package.json` configuring **bun workspaces** so all
platform packages resolve together.

- Root `package.json`: `"type": "module"` plus a workspaces glob that matches
  the per-platform packages, e.g. `skills/*/platforms/*/`.
- Each `platforms/<harness>/` that has build needs carries its own
  `package.json` as a workspace member, with its own dependencies, build
  script, and a `version` kept in sync with the skill's `VERSION` file.
- `bun.lock` is committed at the root for reproducible installs.
- A `bun install` at the root resolves all workspace members.

## 7. What goes at skill root vs. under `platforms/<harness>/`

The rule of thumb: **shared content at the root, harness-specific content under
the platform directory.**

| Skill root (`skills/<name>/`)                    | `platforms/<harness>/`                              |
|--------------------------------------------------|-----------------------------------------------------|
| `SKILL.md` (harness-agnostic)                    | `src/` — harness-specific source (e.g. TS plugin)   |
| `VERSION`, `CHANGELOG.md`                        | `dist/` — committed bundle produced from `src/`     |
| `scripts/` — shared shell scripts                | `package.json` — harness workspace member, deps     |
| `references/` — shared reference docs            | `tsconfig.json` — harness build config              |
| `assets/` — shared templates/fixtures            | `install-manifest.txt` — source→dest mapping        |
|                                                  | `README.md` — install instructions for this harness |

A file goes under `platforms/<harness>/` if and only if it is specific to one
harness: its source code, its compiled output, its build configuration, its
install manifest, and its install instructions. Everything a harness consumes
identically lives once at the shared root and is referenced from there (in a
manifest via `../../`, in docs via a relative path from the skill directory).
