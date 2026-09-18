# revdiff — opencode install

Copies the shared skill files into opencode's user skills directory.

Destination base: `~/.config/opencode/` (overridable via `OPENCODE_CONFIG_DIR`);
opencode skills live under `skill/` (singular).

An agent (or human) applies `install-manifest.txt` — one `<source>::<dest>` pair
per line, sources relative to this directory, dests relative to the base — by
plain-copying each file (never symlinks).

After install, verify `scripts/open-review.sh` kept its executable bit:

```sh
chmod +x ~/.config/opencode/skill/revdiff/scripts/open-review.sh
```

Runtime requirements on the machine: agterm + `agtermctl`, `revdiff`.
