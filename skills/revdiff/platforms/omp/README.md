# revdiff — omp install

Copies the shared skill files into omp's user skills directory.

Destination base: `~/.omp/agent/` (skills live under `skills/`; the directory is
created on first install).

An agent (or human) applies `install-manifest.txt` — one `<source>::<dest>` pair
per line, sources relative to this directory, dests relative to the base — by
plain-copying each file (never symlinks).

After install, verify `scripts/open-review.sh` kept its executable bit:

```sh
chmod +x ~/.omp/agent/skills/revdiff/scripts/open-review.sh
```

Runtime requirements on the machine: agterm + `agtermctl`, `revdiff`.

Note: omp's `~/.omp/agent/managed-skills/` is for auto-generated skills — user
skills like this one belong in `~/.omp/agent/skills/`.
