# Notes skill — opencode install

This is the opencode platform package for the `notes` skill. Install is
manifest-driven: copy each file listed in `install-manifest.txt` to a location
under your opencode config directory.

## Dest base

The destination base is `~/.config/opencode/`. Override it with the
`OPENCODE_CONFIG_DIR` environment variable if your config lives elsewhere.

## Steps

1. **Copy files per the manifest.** Read `install-manifest.txt` (in this
   directory) and copy every `<source>` to `<dest>` under the config base.
   Sources are relative to this `platforms/opencode/` directory; destinations
   are relative to the config base. For example, `dist/index.js` maps to
   `plugins/notes.js` (the plugin bundle) and `../../SKILL.md` maps to
   `skill/notes/SKILL.md`.

2. **Point the registry at your projects.** The manifest renames the template
   `registry.example.json` to `skill/notes/registry.json` on the first install
   (its `if-missing` entry), and never touches an existing `registry.json` on a
   re-install — so your configured projects are never overwritten. Replace the
   placeholder values in `registry.json` with your real projects:

   ```json
   {
     "example-project": {
       "root": "/path/to/project",
       "default": true
     }
   }
   ```

   - `root` — absolute path to a project root. The project exposes `conf/list`
     and `conf/add_task` under it (see `SKILL.md` / `references/architecture.md`).
   - `default: true` — exactly one project should be the default fallback.

`registry.json` is machine-specific and should stay untracked/bypassed by any
sync of your dotfiles.
