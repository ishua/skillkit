# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `revdiff` skill: opens a revdiff review in an agterm overlay over the agent's
  own session — a document for review (`--only`), uncommitted changes of a
  file, a whole-branch diff against the base branch, or explicit refs
- `scripts/open-review.sh`: environment checks (agterm, agtermctl, revdiff),
  absolute-path launch, `--target`/`--cwd`/`--pane`/`--follow` handling, and
  annotation-file plumbing (`-o`) with exit-code propagation
### Changed
### Fixed
### Removed

---
