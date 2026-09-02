# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
### Changed
### Fixed
### Removed

---

## [0.1.1] — 2026-09-02

### Added

- Plugin entry point (`src/index.ts`) wiring `capture_finding`, `add_project`,
  `remove_project`, `list_projects` tools
- Registry helpers: `getRegistryPath`, `loadRegistry`, `saveRegistry`
- Shared types: `Project`, `Registry`, `AddProjectParams`, `RemoveProjectParams`
- `capture_finding` full routing: registry → `conf/list` alias matching →
  `conf/add_task` (stdin JSON) with fallback to the default project
- `add_project` (validates params, enforces a single default) and
  `remove_project` (deletes by name, errors when not found)
- `list_projects` returning the registry as a JSON array of projects
- Unit tests for each tool (mocked exec/fs via temp dir) and an integration
  test covering the full route with real `conf/list` / `conf/add_task` scripts
- Bundled `dist/index.js` for install
- `SKILL.md` with trigger recognition («добавь в заметки», "note it down",
  "add note"), agent instructions, and usage examples
- Manifest-driven `scripts/install.sh` (`install-manifest.txt`): copies
  `SKILL.md`, `dist/index.js` (as `plugins/notes.js`), `skill/about.txt`, and
  `registry.json` into `~/.config/opencode/` with a stray-file check for
  `skill/notes/`
- `scripts/version.sh`: SemVer release workflow (patch/minor/major) that bumps
  `skill/about.txt` and restructures CHANGELOG.md, with `--dry-run` support
- Smoke test for `scripts/install.sh` in `test/scripts/install.test.ts`
  (installs to a temp `OPENCODE_CONFIG_DIR`, never the real `~/.config`)
- `gr.md` — architecture doc for findings capture (dispatcher + per-project
  `conf/list` / `conf/add_task` contract)
- Test for `scripts/version.sh` in `test/scripts/version.test.ts` (SemVer bump,
  error paths, `--dry-run`)

### Changed

- `saveRegistry` now writes atomically (temp file + rename) so a crash or
  concurrent write never leaves a truncated `registry.json` in place
- `capture_finding` `conf/list` execution now has a 5s per-project timeout so a
  hanging script cannot block routing indefinitely
- `capture_finding` `conf/add_task` now guards the stdin stream against
  EPIPE/unhandled errors
- `add_project` validates that `root` is an absolute path (relative roots
  silently broke the later exec calls)
- `version.sh` git commit/tag steps are idempotent so a partial re-run no longer
  aborts the release under `set -e`
- `SKILL.md` now documents the project API contract (`conf/list` / `conf/add_task`)
  and the canonical substring matching + first-match-wins routing behavior
- `gr.md` open questions marked as resolved (substring matching, no list cache,
  concrete error strings)
- `src/index.ts` now imports tools through the `src/tools` barrel instead of
  individual modules
- Self-contained `install.sh` tests (each creates its own temp config dir) plus
  a non-default-project routing case and python3 guard in the capture_finding
  integration suite
- `add_project` / `remove_project` / `list_projects` no longer take an unused
  `ctx` argument (`src/tools/*.ts`, `src/index.ts`)
- Registry install path single-sourced as `INSTALLED_REGISTRY_PATH`
  (`src/registry.ts`) and reused by tests, removing duplicated path literals
- Extracted shared test helpers (`test/helpers.ts`): `setupRegistryDir` for the
  temp-dir/env boilerplate duplicated across all suites, and a typed `runTool`
  wrapper replacing the pervasive `as any` `.execute` casts with the magic `{}`
  context arg
- `capture_finding` named `ISO_DATE_LENGTH` constant and dropped a redundant
  `.catch` on the `conf/list` text promise (timeout already provides the
  fallback)

### Removed

### Fixed

- `loadRegistry` now logs a warning (to stderr) when the registry file is
  malformed instead of silently returning an empty registry
- Plugin bundle (`dist/index.js`) now exports only `default` — the legacy
  opencode loader treats every named export as a plugin, so the previously
  re-exported `saveRegistry`/`loadRegistry`/`getRegistryPath` functions were
  invoked as plugins and crashed the `config`/`dispose` hooks ("undefined is
  not an object evaluating 'N.config'"), which in turn broke provider loading
  and surfaced as `Error: Unexpected server error` in the TUI. Removed the
  named re-exports from `src/index.ts`; `test/registry.test.ts` now imports
  helpers directly from `src/registry`

