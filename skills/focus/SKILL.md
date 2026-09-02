---
name: focus
description: Collects the user's tasks from their configured file sources into
  one normalized list. Invoked explicitly via /skill:focus.
disable-model-invocation: true
---

# focus

Reads the user's task sources and produces a single consolidated list.
This version collects only. It does not rank, prioritize, or recommend.

## Config

Read `config.json`.

If the file does not exist, say so, show the expected shape, and stop.
Never guess source paths.

```json
{
  "sources": [
    { "path": "...", "description": "...", "readme": "..." }
  ]
}
```

- `path` — file to read.
- `description` — how to treat this specific source. Treat it as an
  extension of these instructions, scoped to that source. It overrides
  anything general.
- `readme` — optional path to a longer document about the source.
  Read it only when `description` is not enough to make sense of the
  file. It costs context; skip it by default.

## Steps

1. Read the config.
2. For each source, in config order: read the file, apply its
   `description`, extract tasks.
3. If a file is missing or unreadable, do not stop and do not stay
   silent. Record it and continue with the remaining sources.
4. Output.

## Arguments

If arguments follow the command, treat them as a filter or as context
for this run (for example: only work sources, only one file). Apply
them to what gets shown. They never modify the config.

## Output

Group by source, in config order. Keep each task's original wording;
strip only list syntax and indentation. Do not rewrite tasks.

End with:
- a count: how many tasks, from how many sources;
- a `Problems` section listing unreadable files and anything you could
  not interpret — include this section only when it is non-empty.

Do not sort. Do not prioritize. Do not suggest what to start with.
Do not add closing commentary.
