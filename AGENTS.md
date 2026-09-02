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

## Installation

Never install skills with symlinks. Installation always goes through the
scripts in `scripts/`, which copy files to the target location.

A symlink makes an installed skill mutate on every repo change, erasing the
line between source and installed copy and silently altering behavior on other
people's machines.

The maintainer may point a harness at this repo through harness settings for
local development. That is a development convenience, not an install path, and
must not be documented as one.

## Skill format

Skills follow the Agent Skills standard (https://agentskills.io/specification).

    skills/<skill-name>/
    ├── SKILL.md          # required
    ├── scripts/          # optional helper scripts
    ├── references/       # optional docs, loaded on demand
    └── assets/           # optional templates and fixtures

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

Reference files inside a skill by relative path from the skill directory.

## Harness support

Target opencode, Claude Code and pi where possible. All three implement the
same standard, so most skills port without changes.

When a skill cannot be portable, say so explicitly in its SKILL.md or README:
which harness it targets, and what breaks elsewhere. An untested harness is not
a supported one — never claim support that has not been verified.

Differences between harnesses are usually install locations, not skill content.
Keep those differences in the install scripts, not in SKILL.md.
