# AGENTS.md

Guidance for AI agents working in this repository.

## What this repo is

skillkit holds the **source** of Agent Skills. It is a development repo, not a
workspace for trying skills out.

Skills here get installed on other machines, by other people. Write every skill
so a stranger can install and run it. If a skill works only because of
something present on this machine, it is not finished.

Do not use this repo as a scratchpad or a sandbox for unrelated experiments.

## Public repository

This repo is public. Everything committed is visible to anyone.

Before writing or committing, verify that no content contains:

- absolute paths revealing a real machine layout (`/Users/<name>/...`)
- names of private projects, clients, employers, or people
- personal goals, plans, notes, or task content
- credentials, tokens, API keys, internal URLs or hostnames

Personal data belongs in a local config that git ignores — never in SKILL.md,
README files, examples, or commit messages.

When a skill needs user-specific settings:

- commit `config.example.json` with placeholder values
- read `config.json` at runtime; it stays untracked
- the skill must fail with a clear message when `config.json` is absent, and
  must never guess paths

## Language

English only: skills, documentation, comments, commit messages, this file.
Models handle English more reliably, and the repo is public.

Conversations with the maintainer may be in any language. Files may not.

User-facing trigger phrases (for example the multilingual note-capture patterns
in the `notes` skill) are a deliberate exception: they are functional, not
documentation prose. Where a skill needs such patterns, the exception is
documented inside that skill's `SKILL.md`.

## Installation

Installation is declarative and manifest-driven. Each platform directory
carries an `install-manifest.txt` (a list of `<source>::<dest>` pairs) and a
`README.md` with instructions. An agent (or the maintainer) reads the manifest
and copies files into the harness config directory — there is no heavy install
script that runs at startup. The manifest format and the per-harness
destination bases are described in `docs/design/versioning-and-install.md`.

Never install skills with symlinks. A symlink makes an installed skill mutate
on every repo change, erasing the line between source and installed copy and
silently altering behavior on other people's machines. Installation is always a
plain file copy.

Differences between harnesses — install locations, bundled runtimes, build
config, per-harness configuration — live under `platforms/<harness>/`, never in
the shared root and never in `SKILL.md`. The shared root and `SKILL.md` stay
harness-agnostic so they are not duplicated per harness.

The maintainer may point a harness at this repo through harness settings for
local development. That is a development convenience, not an install path, and
must not be documented as one.

## Skill format

Skills follow the Agent Skills standard (https://agentskills.io/specification)
and the shared-root + `platforms/` layout described in
`docs/design/versioning-and-install.md`. A skill is a single logical unit that
may ship for several harnesses. Shared content lives once at the skill root;
only harness-specific code, bundles, and install metadata go under per-harness
platform directories.

    skills/<skill-name>/
    ├── SKILL.md               # required, shared (harness-agnostic)
    ├── VERSION                # single line, e.g. "0.1.0"
    ├── CHANGELOG.md           # per-skill changelog (Keep a Changelog)
    ├── scripts/               # optional shared helper scripts
    ├── references/            # optional shared docs, loaded on demand
    ├── assets/                # optional shared templates and fixtures
    └── platforms/
        ├── opencode/          # harness-specific src, dist, manifest, README
        ├── claude-code/       # (future)
        └── pi/                # (future)

A file goes under `platforms/<harness>/` if and only if it is specific to one
harness: its source, its compiled output, its build configuration, its install
manifest, and its install instructions. Everything a harness consumes
identically (SKILL.md, VERSION, CHANGELOG.md, scripts, references, assets)
lives once at the skill root. A harness gets a directory only once it has a
real implementation; porting a skill across harnesses is additive.

Frontmatter uses standard fields only: `name`, `description`, `license`,
`compatibility`, `metadata`, `allowed-tools`, `disable-model-invocation`.

Do not invent frontmatter fields. Harnesses ignore unknown keys, so an invented
field looks like it works while doing nothing. Custom data goes under
`metadata`.

Name rules: lowercase letters, digits and hyphens; no leading, trailing or
consecutive hyphens; 64 characters max. Keep the name equal to the directory
name — some harnesses require it.

The `description` decides when a skill loads: state what it does and when to
use it. If a skill should run only on explicit request, set
`disable-model-invocation: true` instead of asking the model in prose to hold
back.

Reference files inside a skill by relative path from the skill directory, and
from a platform directory by a `../../` path into the shared root.

### Committed bundles

Users install a skill on another machine and generally do not build from
source. Compiled bundles are therefore committed under
`platforms/<harness>/dist/`. The root `.gitignore` ignores `dist/` globally,
so a negation exception (`!skills/*/platforms/*/dist/`) keeps these bundles
tracked. Because the bundle is committed, an installed skill runs without a
local toolchain and install is a plain file copy.

### User-specific configuration

User-specific settings (for example the `notes` project registry) are never
committed. Ship a template as `<name>.example.json` (such as
`registry.example.json`) with placeholder values; at install time the user
copies it to the real config file (e.g. `registry.json`) and fills in their
values. The runtime config stays untracked. This is the same rule as the
`config.example.json` / untracked `config.json` convention above.

## Versioning

Each skill is versioned independently; versions never live at the repository
root because skills evolve on different cadences and are installed
independently. A skill carries:

- `VERSION` — a single line `X.Y.Z` (SemVer 2.0.0), the canonical source of
  truth for that skill's version. Any per-platform `package.json` keeps its
  `version` field in sync with this file.
- `CHANGELOG.md` — a per-skill changelog in Keep a Changelog 1.1.0 format. A
  `## [Unreleased]` section is always present; on release it becomes a dated
  heading and a fresh empty one is inserted above it.
- Namespaced git tags — `<skill-name>/vX.Y.Z` (e.g. `notes/v0.1.0`,
  `focus/v1.2.0`), so a single repo holds many skills without tag collisions.

Releases are driven by the root script:

    scripts/release.sh <skill> [patch|minor|major] [--dry-run]

It reads `skills/<skill>/VERSION`, validates and bumps it, rewrites
`CHANGELOG.md`, writes the new version back, and — in production mode — commits
and creates the namespaced annotated tag. `--dry-run` previews the result without
modifying files or git. Tagging is always done by `release.sh`, never by hand.
See `docs/design/versioning-and-install.md` for the full contract.

## Harness support

Target opencode, Claude Code and pi where possible. All three implement the
same standard, so most skills port without changes.

When a skill cannot be portable, say so explicitly in its SKILL.md or README:
which harness it targets, and what breaks elsewhere. An untested harness is not
a supported one — never claim support that has not been verified.

Differences between harnesses are usually install locations, not skill content.
Keep those differences in `platforms/<harness>/`, not in the shared root or in
SKILL.md.
