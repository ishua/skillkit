#!/bin/bash
# release.sh — Automated SemVer release workflow for a skill.
# Usage: scripts/release.sh <skill> [patch|minor|major] [--dry-run] [-h|--help]
set -euo pipefail

# Print "Error: <message>" to stderr and exit non-zero.
fail() {
  echo "Error: $*" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: scripts/release.sh <skill> [patch|minor|major] [--dry-run] [-h|--help]

Arguments:
  <skill>                  Skill name, resolved against skills/<skill>/
  patch|minor|major        Version bump type (default: patch)
  --dry-run                Preview the release without modifying files or git
  -h, --help               Show this help message and exit
EOF
}

# bump_version current bump_type → new_version
bump_version() {
  local current="$1"
  local bump_type="$2"
  local major minor patch

  # Validate SemVer format (X.Y.Z, each component numeric, no leading zeros)
  if ! [[ "$current" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
    fail "Invalid SemVer version: ${current}"
  fi

  IFS='.' read -r major minor patch <<< "$current"

  case "$bump_type" in
    patch) patch=$((patch + 1)) ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    major) major=$((major + 1)); minor=0; patch=0 ;;
  esac

  printf '%s.%s.%s\n' "$major" "$minor" "$patch"
}

# --- Argument parsing ---

skill=""
bump_type="patch"
dry_run=false
positional=()

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      usage
      exit 0
      ;;
    --dry-run)
      dry_run=true
      ;;
    *)
      positional+=("$arg")
      ;;
  esac
done

if [ "${#positional[@]}" -ge 1 ]; then
  skill="${positional[0]}"
fi
if [ "${#positional[@]}" -ge 2 ]; then
  bump_type="${positional[1]}"
fi
if [ "${#positional[@]}" -ge 3 ]; then
  usage >&2
  fail "Unknown argument: ${positional[2]}"
fi

if [ -z "$skill" ]; then
  usage >&2
  fail "missing required <skill> argument"
fi

case "$bump_type" in
  patch|minor|major) ;;
  *)
    fail "Invalid bump argument '${bump_type}'. Expected patch, minor, or major."
    ;;
esac

# --- Determine file paths ---

version_file="skills/${skill}/VERSION"
changelog_file="skills/${skill}/CHANGELOG.md"

if [ ! -f "$version_file" ]; then
  fail "Version file not found: ${version_file}"
fi

current_version=$(tr -d '[:space:]' < "$version_file")
if [ -z "$current_version" ]; then
  fail "Version file is empty or contains only whitespace: ${version_file}"
fi

new_version=$(bump_version "$current_version" "$bump_type")
tag="${skill}/v${new_version}"

if [ ! -f "$changelog_file" ]; then
  fail "CHANGELOG.md not found: ${changelog_file}"
fi

# --- Precondition: must be on master/main branch in a git repo (production mode) ---

if [ "$dry_run" = false ]; then
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    fail "Not a git repository. Cannot commit or tag."
  fi

  current_branch=$(git rev-parse --abbrev-ref HEAD)
  if [ "$current_branch" != "master" ] && [ "$current_branch" != "main" ]; then
    fail "Releases must be created on master or main branch. Current branch: ${current_branch}"
  fi
fi

# --- Transform CHANGELOG.md ---
#   1. Rename "## [Unreleased]" → "## [X.Y.Z] — YYYY-MM-DD"
#   2. Insert fresh "## [Unreleased]" with empty subsections above it
#   3. Keep old unreleased content under the new dated heading
#   4. Preserve content below the "---" separator
update_date=$(date -u +%Y-%m-%d)

render_changelog() {
  awk -v new_version="$new_version" -v date="$update_date" '
  BEGIN { in_unreleased = 0 }

  /^## \[Unreleased\]/ {
    print "## [Unreleased]"
    print ""
    print "### Added"
    print "### Changed"
    print "### Fixed"
    print "### Removed"
    print ""
    print "---"
    print ""
    printf "## [%s] — %s\n", new_version, date
    in_unreleased = 1
    next
  }

  /^---$/ && in_unreleased {
    in_unreleased = 0
    print ""
    print $0
    next
  }

  /^## / && in_unreleased {
    in_unreleased = 0
    print $0
    next
  }

  in_unreleased { print; next }

  { print }
  ' "$changelog_file"
}

# --- Output / apply ---

echo "old=${current_version} new=${new_version} tag=${tag}"

if [ "$dry_run" = true ]; then
  echo "---"
  render_changelog
  exit 0
fi

echo "$new_version" > "$version_file"
render_changelog > "${changelog_file}.tmp" && mv "${changelog_file}.tmp" "$changelog_file"

git add "$version_file" "$changelog_file"
# Idempotent: a partial re-run (tree already clean / tag already created)
# must not abort the release under `set -e`.
if ! git diff --cached --quiet; then
  git commit -m "chore(${skill}): release v${new_version}"
fi
if ! git rev-parse "$tag" >/dev/null 2>&1; then
  git tag -a "${tag}" -m "Release ${tag}"
fi
