---
name: revdiff
description: |-
  Opens an interactive revdiff review in an agterm overlay on top of the agent's own session: a document (a plan, a spec) for reading and annotating, or the current changes / diff of the working tree or a branch.
  Use when the user asks to open something for review or show a diff — «открой план для ревью», «открой изменения», «открой изменения плана», «покажи диф», "open revdiff", "show diff", "review the plan" — or when the agent wants to put its own changes in front of the user.
---

# revdiff — open a review in an agterm overlay

<critical>
The review runs in an agterm overlay over YOUR OWN session (`$AGTERM_SESSION_ID`). Never open the
overlay on `active` — that is the session the USER selected, not yours. Do not paste diffs into the
chat instead of opening the review.
</critical>

## Requirements

- agterm running with this shell inside it (`AGTERM_ENABLED=1`, `AGTERM_SESSION_ID` set) and
  `agtermctl` on PATH. Without agterm print the equivalent `revdiff …` command for the user to run
  in their terminal and stop.
- `revdiff` (`brew install umputun/apps/revdiff`).

## Step 1 — figure out what to open

| The user asks | revdiff arguments |
|---|---|
| Open a document for review («открой план для ревью») | `--only <path>` — the document opens as-is; single-file markdown gets a TOC pane |
| Changes of a specific document («открой изменения плана») | `--only <path>` — the uncommitted diff of that file against the last commit |
| Changes, nothing specific («открой изменения») | On a branch: `<base>` (e.g. `master`) — the whole branch diff plus uncommitted changes. On master/main: no refs — uncommitted changes only |
| Explicit refs | Positional: `HEAD~2 HEAD`, `main feature`, `--staged` |

Notes:

- If the path was not named in the request and is not obvious from the current work, ask.
- For the branch base use `master`, or `main` when there is no `master`. If it is still unclear
  what to diff against what, ask — one short question instead of guessing.
- Add `--untracked` when agent-created files should be part of the review.
- Optional: `--description "<one line>"` gives the reviewer context in the info popup (`i`).

## Step 2 — open the overlay

Run the helper script from this skill's directory (resolve its absolute path at runtime):

```sh
scripts/open-review.sh --follow -- \
  --only docs/plans/auth-redesign.md \
  --description "plan after the scope discussion"
```

- Pass `--follow` when the user asked to see the review now — it switches them to the overlay.
  Presenting changes proactively: omit `--follow` (the overlay opens quietly on your session), then
  say one line that the review is ready.
- `--cwd DIR` (default: current directory) and `--pane left|right` (overlay one split pane, sibling
  stays live) are optional.

The script checks the environment, resolves revdiff to an absolute path, opens the overlay with
`--target "$AGTERM_SESSION_ID" --block`, and exits with revdiff's status. Its stdout ends with
`annotations=<path>` when annotations were captured.

Manual fallback (when the script is not available), same mechanics — note the whole command is ONE
argument because the overlay runs it via `sh -c`, and the overlay shell has the app's GUI PATH (no
`/opt/homebrew/bin`), so revdiff must be an absolute path:

```sh
prog="$(command -v revdiff)"
agtermctl session overlay open \
  "$prog --only docs/plan.md --description 'what changed and why'" \
  --cwd "$PWD" --target "$AGTERM_SESSION_ID" --block
```

## Step 3 — read the outcome

- Exit `0` — the user closed the review with no annotations. Report one line and move on.
- Exit `10` — annotations were captured. Read the `annotations=<path>` file printed by the script;
  treat every annotation as a change request: apply the changes, do not argue or explain.
- Exit other than `10` but the user says they annotated (e.g. the annotations were dropped at the
  quit prompt) — recover them from the newest file under
  `~/.config/revdiff/history/<cwd-basename>/`: revdiff auto-saves every review there on quit.
- Anything else — the launch or the review failed. Diagnose with
  `agtermctl session overlay result --target "$AGTERM_SESSION_ID" --json` (exit `127` = non-absolute
  path; `1` with stderr = bad arguments) and `agtermctl session overlay text` to see what the
  overlay rendered.

## Pitfalls

1. **Always `--target "$AGTERM_SESSION_ID"`.** `active` resolves to the user's selected session;
   an overlay opened there is invisible to you and confusing to them.
2. **Absolute path only.** A bare `revdiff` exits 127 in the overlay (GUI PATH), the overlay flashes
   shut with no visible error.
3. **`--cwd` explicitly.** The default is the session's current directory, which may be stale or not
   the repo you mean.
4. **One overlay slot per session** (shared with the HUD): a second `overlay open` replaces whatever
   is running. Close with `agtermctl session overlay close --target "$AGTERM_SESSION_ID"`.
5. `session text` / `session copy` read the pane UNDER the overlay; the overlay itself is read via
   `session overlay text` / `session overlay copy`.
