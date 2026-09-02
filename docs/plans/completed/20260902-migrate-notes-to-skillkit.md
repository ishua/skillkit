# Migrate notes to skillkit + versioning/install design

## Overview

skillkit is a public monorepo holding the **source** of Agent Skills. It currently
contains only `skills/focus/` (a markdown-only skill) and lacks any build,
versioning, or multi-harness infrastructure. The notes-skill is a fully functional
opencode plugin with TypeScript source, a bundled dist, a versioning script, and
a manifest-driven install. This plan designs the shared-root + platforms/ model
for skillkit and migrates notes as the first real skill under it.

## Context

- skillkit `AGENTS.md` rules: install by copy only (no symlinks), `config.json`
  untracked + `config.example.json` with placeholders, English only, standard
  skill format, harness differences in install scripts not in SKILL.md, public
  repo (no absolute paths / personal data).
- notes-skill (the prior standalone source repo): TypeScript
  plugin source in `src/`, bundled `dist/index.js`, manifest-driven
  `scripts/install.sh`, SemVer `scripts/version.sh`, `CHANGELOG.md`,
  `skill/about.txt` (version 0.1.0), `registry.json` (seed with an absolute
  personal machine path — must become `registry.example.json`).
- skillkit `.gitignore` ignores `dist/` globally — needs exception for
  `!skills/*/platforms/*/dist/`.
- notes-skill `SKILL.md` and `gr.md` contain absolute paths; `gr.md` is in
  Russian (violates skillkit English-only rule) — handle carefully during
  migration.

## Development Approach

- **testing approach**: Regular — code first, tests during implementation
- Complete each task before moving to the next
- **CRITICAL**: every task MUST include verification steps
- **CRITICAL**: all verification must pass before starting next task

## Testing Strategy

- `bun build` smoke test for the TypeScript plugin
- `bun test` for existing notes-skill tests (migrated to new location)
- `release.sh --dry-run` validation (no git operations performed)
- Full test suite pass before any commit

## Solution Overview

**Shared-root + platforms/ layout** per the chosen approach:

```
skills/<name>/
├── SKILL.md               # shared (harness-agnostic)
├── VERSION                # single line, e.g. "0.1.0"
├── CHANGELOG.md           # per-skill changelog (Keep a Changelog format)
├── scripts/               # shared shell scripts (harness-agnostic)
├── references/            # shared reference docs
├── assets/                # shared templates/fixtures
└── platforms/
    ├── opencode/
    │   ├── src/           # harness-specific source (TS plugin)
    │   ├── dist/          # committed bundle (index.js)
    │   ├── package.json  # workspace member with harness deps
    │   ├── tsconfig.json
    │   ├── install-manifest.txt   # source→dest mapping
    │   └── README.md      # install instructions for this harness
    ├── claude-code/       # (future)
    └── pi/               # (future)
```

- Common files (SKILL.md, shared scripts, references, assets) live at skill root —
  no duplication.
- Only harness-specific code/manifests go under `platforms/<harness>/`.

**Versioning**: per-skill `VERSION` + `CHANGELOG.md`, namespaced git tags
`notes/v0.1.0`, root `scripts/release.sh <skill> [patch|minor|major]` automates
bump + changelog restructure + commit + tag.

**Installation**: declarative via `install-manifest.txt` (source→dest pairs) +
`README.md` with install instructions. An agent reads the manifest and copies
files — no heavy install scripts at startup.

**Build**: root `package.json` (bun workspaces), each `platforms/<harness>/` with
build needs has its own `package.json` as workspace member.

## Technical Details

- **Version file**: `skills/<name>/VERSION` — single line, no whitespace beyond
  the newline. Format: `X.Y.Z`.
- **Git tags**: `<skill-name>/vX.Y.Z` (e.g. `notes/v0.1.0`, `focus/v1.2.0`).
- **Changelog format**: Keep a Changelog 1.1.0 + SemVer 2.0.0.
  `## [Unreleased]` section always present; `## [X.Y.Z] — YYYY-MM-DD` replaces it
  on release.
- **release.sh**: reads `VERSION`, bumps SemVer, rewrites CHANGELOG.md
  (rename Unreleased → dated, insert fresh Unreleased), `git add`, `git commit`,
  `git tag -a`. `--dry-run` supported.
- **install-manifest.txt** format: `<source>::<dest>` per line, source relative
  to the manifest file's own directory (i.e. `platforms/<harness>/`), dest
  relative to harness config dir. This means shared files at skill root are
  referenced as `../../SKILL.md`, local files as `dist/index.js`. Blank lines
  and `#`-prefixed comments ignored.
- **registry.example.json**: placeholder shape, no real paths, must be renamed
  to `registry.json` at install time (left untracked in installed location).
- **dist committed**: `.gitignore` exception `!skills/*/platforms/*/dist/` allows
  committed bundles. Users do not build from source.
- **Build command**: `bun build platforms/opencode/src/index.ts --outdir
  platforms/opencode/dist --target bun` from the skill root.

## What Goes Where

| File in notes-skill | Goes to skillkit |
|---------------------|-------------------|
| `SKILL.md` | `skills/notes/SKILL.md` (shared root; strip absolute paths) |
| `skill/about.txt` | `skills/notes/VERSION` |
| `CHANGELOG.md` | `skills/notes/CHANGELOG.md` |
| `src/` | `skills/notes/platforms/opencode/src/` |
| `dist/index.js` | `skills/notes/platforms/opencode/dist/index.js` |
| `test/` | `skills/notes/platforms/opencode/test/` |
| `package.json` | split: root workspace + `platforms/opencode/package.json` |
| `tsconfig.json` | `skills/notes/platforms/opencode/tsconfig.json` |
| `registry.json` | `skills/notes/platforms/opencode/registry.example.json` |
| `scripts/install.sh` + `install-manifest.txt` | `platforms/opencode/install-manifest.txt` + `README.md` |
| `scripts/version.sh` | generalized into `scripts/release.sh` |
| `docs/` | `skills/notes/references/` |
| `gr.md` | **excluded** (Russian; violates English-only rule — migrate content as a separate task) |
| `Makefile` | **excluded** (replaced by `scripts/release.sh` and declarative install) |
| `.opencode/` | not transferred (gitignored) |
| `AGENTS.md` | **not migrated** — entirely in Russian, notes-skill-specific conventions superseded by skillkit's own AGENTS.md. Relevant conventions (per-file < 150 lines, barrel imports) are already covered or will be added to skillkit AGENTS.md in Task 5. |

## Implementation Steps

### Task 1: Design document — versioning & install model
**Files:**
- Create: `docs/design/versioning-and-install.md`

- [x] Write `docs/design/versioning-and-install.md` covering:
  - Shared-root + platforms/ layout rationale
  - Per-skill versioning: `VERSION`, `CHANGELOG.md`, namespaced git tags
  - `scripts/release.sh` behavior and `--dry-run` support
  - Declarative install: `install-manifest.txt` format + harness config dir base
  - Dist policy: committed bundles, `.gitignore` exception
  - Workspace setup: root `package.json` + per-platform workspace members
  - What goes at skill root vs. under `platforms/<harness>/`
- [x] verify document is complete and internally consistent

### Task 2: Root infrastructure
**Files:**
- Modify: `.gitignore`
- Create: `package.json`
- Create: `scripts/release.sh`

- [x] Update `.gitignore`: add `!skills/*/platforms/*/dist/` exception so committed
  bundles under platforms/ are not ignored
- [x] Create root `package.json` with `"type": "module"`, bun workspaces config
  pointing to `skills/*/platforms/*/` (or a simpler glob that matches them)
- [x] Run `bun install` at root to verify workspace resolution works
- [x] Commit `bun.lock` at root (standard for reproducible installs)
- [x] Create `scripts/release.sh`: 
  - Usage: `scripts/release.sh <skill> [patch|minor|major] [--dry-run]`
  - Read `skills/<skill>/VERSION` (single line, strip whitespace)
  - Validate SemVer format (`X.Y.Z`)
  - Bump version; `--dry-run` prints result without modifying files
  - Transform `skills/<skill>/CHANGELOG.md`: rename `## [Unreleased]` →
    `## [X.Y.Z] — YYYY-MM-DD`, insert fresh `## [Unreleased]` with sub-headers
    above it; preserve content below the `---` separator
  - Write new version to `skills/<skill>/VERSION`
  - In production mode: `git add skills/<skill>/VERSION skills/<skill>/CHANGELOG.md`
  - `git commit -m "chore(<skill>): release vX.Y.Z"`
  - `git tag -a <skill>/vX.Y.Z -m "Release <skill>/vX.Y.Z"`
  - Error if not on default branch — reject if branch is neither `main` nor
    `master` (matching original `version.sh` behavior)
- [x] `chmod +x scripts/release.sh`
- [x] Write `test/scripts/release.test.ts` covering: patch/minor/major bumps,
  invalid SemVer, missing VERSION file, invalid bump type, `--dry-run` no-modify,
  changelog restructure correctness, help/usage output.
- [x] Verify `scripts/release.sh notes --dry-run` works and produces expected
  output (old version → new version, no files modified)

### Task 3: Migrate notes skill
**Files:**
- Create: `skills/notes/`
- Create: `skills/notes/platforms/opencode/`
- Create: `skills/notes/SKILL.md`, `VERSION`, `CHANGELOG.md`
- Create: `skills/notes/platforms/opencode/src/`
- Create: `skills/notes/platforms/opencode/dist/index.js`
- Create: `skills/notes/platforms/opencode/test/`
- Create: `skills/notes/platforms/opencode/package.json`
- Create: `skills/notes/platforms/opencode/tsconfig.json`
- Create: `skills/notes/platforms/opencode/registry.example.json`
- Create: `skills/notes/platforms/opencode/install-manifest.txt`
- Create: `skills/notes/references/`
- Modify: `AGENTS.md`, `README.md`

- [x] Create `skills/notes/` directory structure
- [x] Copy and adapt `SKILL.md` to `skills/notes/SKILL.md`:
  - Strip all absolute personal paths (e.g. any real machine path) from
    example registry
  - **Russian trigger phrases** («добавь в заметки», «запиши в заметки», etc.)
    are FUNCTIONAL content needed for the skill to work with Russian-speaking
    users. Keep them. Document an explicit exception in SKILL.md: trigger
    phrases are multilingual by design; the English-only rule applies to
    documentation prose, not to user-facing trigger patterns.
  - Change `skill/about.txt` → `VERSION` reference
  - Change `make install` section to reference `platforms/opencode/README.md`
  - Change `~/.config/opencode/skill/notes/registry.json` → `registry.json` at
    install location (document both source and dest in install-manifest)
- [x] Copy `skill/about.txt` content into `skills/notes/VERSION` (single line: `0.1.0`)
- [x] Copy `CHANGELOG.md` unchanged to `skills/notes/CHANGELOG.md`
- [x] Copy `src/` to `skills/notes/platforms/opencode/src/`
  - Update `INSTALLED_REGISTRY_PATH` / `NOTES_REGISTRY_PATH` if hardcoded paths exist
  - Verify no absolute paths remain in source
- [x] Copy `dist/index.js` to `skills/notes/platforms/opencode/dist/index.js` (already bundled)
- [x] Copy `test/` to `skills/notes/platforms/opencode/test/`
  - Update any hardcoded paths (`NOTES_REGISTRY_PATH` env overrides should handle this)
  - **Delete `test/scripts/install.test.ts`** — tests `scripts/install.sh` which
    no longer exists. Replace with `test/scripts/install-manifest.test.ts` that
    validates the manifest format (parses entries, checks source files exist).
  - **Rewrite `test/scripts/version.test.ts` → `test/scripts/release.test.ts`**:
    test the new `scripts/release.sh` API (`scripts/release.sh <skill> [bump]
    [--dry-run]`), reading `VERSION` (not `about.txt`), namespaced tags, and
    dry-run behavior. Move to root-level `test/` directory since `release.sh`
    lives at repo root.
- [x] Copy `package.json` to `skills/notes/platforms/opencode/package.json`
  - Rename `"name"` to `"name": "skillkit-notes-opencode"` (workspace-scoped)
  - Remove root-level version — per-skill version lives in `VERSION`
  - Keep `"version"` field in sync with `VERSION` file (set to `"0.1.0"`) to
    avoid bun workspace confusion
  - Update `build` script: `bun build src/index.ts --outdir dist --target bun`
- [x] Copy `tsconfig.json` to `skills/notes/platforms/opencode/tsconfig.json`
- [x] Copy `docs/` → `skills/notes/references/` **excluding** `docs/plans/`
  (implementation history in Russian with absolute paths — violates skillkit
  English-only and no-personal-data rules). Do NOT copy
  `docs/plans/completed/notes-skill-implementation.md`.
- [x] Create `skills/notes/references/` from `gr.md` content:
  - **Exclude `gr.md` as-is** — it is in Russian and violates English-only rule.
  - Create `skills/notes/references/architecture.md` with an English summary of
    the dispatcher architecture (translate the substance, not the Russian text).
    Keep a note: "Original design notes in Russian were excluded per repo policy."
- [x] Create `skills/notes/platforms/opencode/registry.example.json`:
  - Use same JSON shape as original `registry.json`
  - Replace absolute paths with placeholder examples:
    ```json
    {
      "example-project": {
        "root": "/path/to/project",
        "default": true
      }
    }
    ```
  - Do NOT add inline JSON comments (invalid JSON). Document the template
    purpose in `platforms/opencode/README.md` instead.
- [x] Create `skills/notes/platforms/opencode/install-manifest.txt`:
  ```
  # Install manifest for notes skill (opencode platform)
  # Format: <source>::<dest> (relative to skill root :: relative to $OPENCODE_CONFIG_DIR)
  ../../SKILL.md::skill/notes/SKILL.md
  platforms/opencode/dist/index.js::plugins/notes.js
  VERSION::skill/notes/VERSION
  platforms/opencode/registry.example.json::skill/notes/registry.json
  ```
- [x] Create `skills/notes/platforms/opencode/README.md`:
  - Short install instructions: read manifest, copy files, rename registry.example.json
  - Dest base: `~/.config/opencode/` (overridable via `OPENCODE_CONFIG_DIR`)
  - Steps: 1. Copy files per manifest 2. Rename `registry.example.json` to
    `registry.json` and fill in actual project paths
  - No absolute paths, no machine-specific instructions
- [x] Run `bun install` at root — verify workspace detects
  `skills/notes/platforms/opencode/package.json`
- [x] Run `bun build` under `skills/notes/platforms/opencode/` — verify output
  `dist/index.js` is identical to the migrated one
- [x] Run `bun test` under `skills/notes/platforms/opencode/` — all tests pass

### Task 4: Verify acceptance criteria
**Files:** (none)

- [x] `scripts/release.sh notes --dry-run` prints: old=0.1.0, new=0.1.1, no files modified
- [x] `.gitignore` exception `!skills/*/platforms/*/dist/` is present and correct
- [x] Root `package.json` has workspaces; `bun install` resolves notes-opencode dep
- [x] `skills/notes/VERSION` exists and contains `0.1.0` (single line, no whitespace)
- [x] `skills/notes/SKILL.md` has no absolute paths, describes install via README
- [x] `skills/notes/platforms/opencode/registry.example.json` has placeholder paths
  and a comment indicating it is a template
- [x] `skills/notes/platforms/opencode/install-manifest.txt` has all required entries
- [x] `skills/notes/platforms/opencode/dist/index.js` exists (committed bundle)
- [x] `skills/notes/references/` exists with English architecture doc; `gr.md` not copied as-is
- [x] `skills/focus/` is unaffected (no changes to existing skill)
- [x] Run full test suite (`bun test` at root or skill level) — all tests pass

### Task 5: Update documentation
**Files:**
- Modify: `AGENTS.md`, `README.md`

- [x] Update `AGENTS.md` Skill format section to reflect shared-root + platforms/
  model: add `VERSION`, `CHANGELOG.md`, `platforms/<harness>/` to the directory
  tree example; document dist policy and registry.example.json convention.
  Update name rules, frontmatter guidance, and reference file paths to match.
- [x] Update `AGENTS.md` Installation section to reference the declarative
  manifest + README approach; clarify that differences between harnesses live
  in `platforms/<harness>/`, not in the shared root or in SKILL.md.
- [x] Add a section to `AGENTS.md` on versioning: `VERSION` + `CHANGELOG.md` +
  namespaced tags + `scripts/release.sh`.
- [x] Update root `README.md`:
  - Replace the current placeholder outline with the real structure
  - List available skills (`notes`, `focus`) with harness support summary
  - Point to `skills/<name>/platforms/<harness>/README.md` for per-skill install
  - Add a note about the versioning model and workspace setup
- [x] Commit all changes: `git add -A && git commit -m "docs: add versioning/install model and migrate notes skill"`

## Post-Completion

- OpenCode harness: manually install notes skill from `skills/notes/platforms/opencode/`
  by reading `install-manifest.txt` + `README.md` and copying files to
  `~/.config/opencode/`. Rename `registry.example.json` → `registry.json`,
  update paths.
- Verify `capture_finding`, `add_project`, `remove_project`, `list_projects`
  tools load correctly in opencode (optional smoke test).
- When adding `claude-code` or `pi` platform for notes, create
  `skills/notes/platforms/claude-code/` or `skills/notes/platforms/pi/` with
  analogous structure.
- `focus` skill migration: follow the same layout; future task.