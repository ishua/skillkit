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

2. **Create the registry (first install only).** The manifest places the
   template at `skill/notes/registry.example.json` — it does not overwrite a
   runtime `registry.json`, so a re-install never clobbers your configured
   projects. On the first install, copy the template to `registry.json` (it is
   a template only, used by the skill at runtime) and replace the placeholder
   values with your real projects:

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
