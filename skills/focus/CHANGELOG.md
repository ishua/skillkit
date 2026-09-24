# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
### Changed
### Fixed

- `SKILL.md`: document the plan-dictation exception — a prioritized plan
  passed as arguments is recorded into the daily-buffer source's
  `## план` section instead of being treated as a filter

### Removed

---

## [0.1.1] — 2026-09-02

### Added

- Initial `focus` skill: reads a configured list of task sources from
  `config.json` and produces a single normalized task list
- `config.json` template with a `sources[].path` / `sources[].description` shape

### Changed

### Removed

### Fixed
