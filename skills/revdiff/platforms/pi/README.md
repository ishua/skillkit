# revdiff — pi install

Copies the shared skill files into pi's user skills directory.

Destination base: `~/.pi/agent/` (skills live under `skills/`).

An agent (or human) applies `install-manifest.txt` — one `<source>::<dest>` pair
per line, sources relative to this directory, dests relative to the base — by
plain-copying each file (never symlinks).

After install, verify `scripts/open-review.sh` kept its executable bit:

```sh
chmod +x ~/.pi/agent/skills/revdiff/scripts/open-review.sh
```

Runtime requirements on the machine: agterm + `agtermctl`, `revdiff`.
