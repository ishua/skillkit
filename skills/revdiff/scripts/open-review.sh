#!/bin/sh
# open-review.sh — open a revdiff review in an agterm overlay on top of the
# current agent session, block until the user closes it, and report where the
# captured annotations were written.
#
# Usage:
#   open-review.sh [--follow] [--cwd DIR] [--pane left|right] [--target ID] \
#                  -- REVDIFF_ARGS...
#
# Everything after "--" is passed to revdiff verbatim (mode flags, file paths,
# --description). The script always adds `-o <tempfile>`: inside the overlay
# revdiff's stdout goes to the pty, so annotations are only reachable through
# an output file.
#
# Exit codes:
#   0     — review closed, no annotations
#   10    — annotations were captured; stdout's last line is annotations=<path>
#   64    — bad usage
#   69    — missing dependency (agtermctl, revdiff) or not inside agterm
#   other — propagated from revdiff / the overlay

set -u

follow=0
cwd="$PWD"
pane=""
target="${AGTERM_SESSION_ID:-}"

usage() {
  echo "usage: open-review.sh [--follow] [--cwd DIR] [--pane left|right] [--target ID] -- REVDIFF_ARGS..." >&2
  exit 64
}

need_value() {
  [ "$#" -ge 2 ] || { echo "open-review.sh: $1 needs a value" >&2; exit 64; }
}

while [ $# -gt 0 ]; do
  case "$1" in
    --follow) follow=1; shift ;;
    --cwd)    need_value "$@"; cwd=$2; shift 2 ;;
    --pane)   need_value "$@"; pane=$2; shift 2 ;;
    --target) need_value "$@"; target=$2; shift 2 ;;
    --)       shift; break ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done
[ $# -gt 0 ] || { echo "open-review.sh: no revdiff arguments after --" >&2; exit 64; }

fail() { echo "open-review.sh: $*" >&2; exit 69; }

command -v agtermctl >/dev/null 2>&1 || fail "agtermctl not found on PATH"
[ "${AGTERM_ENABLED:-}" = "1" ] ||
  fail "not inside agterm (AGTERM_ENABLED unset) — give the user this command to run in their terminal: revdiff $*"
[ -n "$target" ] || fail "AGTERM_SESSION_ID is unset — pass --target <session-id>"
revdiff_bin="$(command -v revdiff 2>/dev/null)" ||
  fail "revdiff not found on PATH (brew install umputun/apps/revdiff)"

annotations="$(mktemp "${TMPDIR:-/tmp}/doc-review-annotations.XXXXXX")" ||
  fail "mktemp failed"

# The overlay shell gets the app's GUI PATH (no /opt/homebrew/bin), so revdiff
# must be launched by absolute path. The overlay runs the command via `sh -c`,
# so the whole line is built as ONE shell-safe argument.
quote() {
  printf "'"
  printf '%s' "$1" | sed "s/'/'\\\\''/g"
  printf "'"
}
cmd="$(quote "$revdiff_bin") -o $(quote "$annotations")"
for arg in "$@"; do
  cmd="$cmd $(quote "$arg")"
done

set -- agtermctl session overlay open "$cmd" --cwd "$cwd" --target "$target" --block
[ -n "$pane" ] && set -- "$@" --pane "$pane"
[ "$follow" -eq 1 ] && set -- "$@" --follow

status=0
"$@" || status=$?

if [ "$status" -eq 10 ]; then
  echo "annotations=$annotations"
else
  rm -f "$annotations"
fi
exit "$status"
