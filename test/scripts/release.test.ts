import { describe, test, expect, afterEach } from "bun:test"
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const SCRIPT = resolve("scripts/release.sh")

const CHANGELOG = `# Changelog

All notable changes will be documented in this file.

## [Unreleased]

### Added

- Feature A

### Changed

- Change B

---

## [0.1.0] - 2026-01-01

- Initial release
`

const SKILL = "notes"

const tempDirs: string[] = []

function makeSkillDir(version = "0.1.0", changelog = CHANGELOG): string {
  const dir = mkdtempSync(join(tmpdir(), "release-test-"))
  tempDirs.push(dir)
  mkdirSync(join(dir, "skills", SKILL), { recursive: true })
  writeFileSync(join(dir, "skills", SKILL, "VERSION"), `${version}\n`)
  writeFileSync(join(dir, "skills", SKILL, "CHANGELOG.md"), changelog)
  return dir
}

function run(args: string[], cwd: string) {
  return spawnSync(SCRIPT, args, { cwd, encoding: "utf8" })
}

function versionPath(dir: string) {
  return join(dir, "skills", SKILL, "VERSION")
}

function changelogPath(dir: string) {
  return join(dir, "skills", SKILL, "CHANGELOG.md")
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe("release.sh version bumps", () => {
  test("patch bump", () => {
    const dir = makeSkillDir("0.1.0")
    const res = run([SKILL, "patch", "--dry-run"], dir)
    expect(res.status).toBe(0)
    expect(res.stdout).toContain("old=0.1.0 new=0.1.1 tag=notes/v0.1.1")
  })

  test("minor bump", () => {
    const dir = makeSkillDir("1.2.3")
    const res = run([SKILL, "minor", "--dry-run"], dir)
    expect(res.status).toBe(0)
    expect(res.stdout).toContain("old=1.2.3 new=1.3.0 tag=notes/v1.3.0")
  })

  test("major bump", () => {
    const dir = makeSkillDir("2.9.9")
    const res = run([SKILL, "major", "--dry-run"], dir)
    expect(res.status).toBe(0)
    expect(res.stdout).toContain("old=2.9.9 new=3.0.0 tag=notes/v3.0.0")
  })

  test("defaults to patch when bump is omitted", () => {
    const dir = makeSkillDir("0.5.0")
    const res = run([SKILL, "--dry-run"], dir)
    expect(res.status).toBe(0)
    expect(res.stdout).toContain("old=0.5.0 new=0.5.1 tag=notes/v0.5.1")
  })
})

describe("release.sh errors", () => {
  test("rejects invalid SemVer", () => {
    const dir = makeSkillDir("not.a.version")
    const res = run([SKILL, "patch", "--dry-run"], dir)
    expect(res.status).toBe(1)
    expect(res.stderr).toContain("Invalid SemVer")
  })

  test("rejects leading-zero version components (octal crash)", () => {
    const dir = makeSkillDir("0.0.09")
    const res = run([SKILL, "patch", "--dry-run"], dir)
    expect(res.status).toBe(1)
    expect(res.stderr).toContain("Invalid SemVer")
  })

  test("errors on missing VERSION file", () => {
    const dir = makeSkillDir()
    rmSync(versionPath(dir))
    const res = run([SKILL, "patch", "--dry-run"], dir)
    expect(res.status).toBe(1)
    expect(res.stderr).toContain("Version file not found")
  })

  test("errors on empty or whitespace-only VERSION", () => {
    const dir = makeSkillDir("")
    const res = run([SKILL, "patch", "--dry-run"], dir)
    expect(res.status).toBe(1)
    expect(res.stderr).toContain("empty or contains only whitespace")
  })

  test("errors on missing CHANGELOG.md", () => {
    const dir = makeSkillDir()
    rmSync(changelogPath(dir))
    const res = run([SKILL, "patch", "--dry-run"], dir)
    expect(res.status).toBe(1)
    expect(res.stderr).toContain("CHANGELOG.md not found")
  })

  test("errors on extra positional argument", () => {
    const dir = makeSkillDir()
    const res = run([SKILL, "patch", "extra", "--dry-run"], dir)
    expect(res.status).toBe(1)
    expect(res.stderr).toContain("Unknown argument: extra")
  })

  test("errors on not a git repository in production mode", () => {
    const dir = makeSkillDir()
    const res = run([SKILL, "patch"], dir)
    expect(res.status).toBe(1)
    expect(res.stderr).toContain("Not a git repository")
  })

  test("errors on invalid bump type", () => {
    const dir = makeSkillDir()
    const res = run([SKILL, "bogus", "--dry-run"], dir)
    expect(res.status).toBe(1)
    expect(res.stderr).toContain("Invalid bump argument 'bogus'")
  })

  test("errors when no skill is provided", () => {
    const dir = makeSkillDir()
    const res = run(["--dry-run"], dir)
    expect(res.status).toBe(1)
    expect(res.stderr).toContain("missing required <skill> argument")
  })

  test("--help prints usage and exits 0", () => {
    const dir = makeSkillDir()
    const res = run(["--help"], dir)
    expect(res.status).toBe(0)
    expect(res.stdout).toContain("Usage: scripts/release.sh <skill>")
  })
})

describe("release.sh dry-run", () => {
  test("does not modify VERSION or CHANGELOG", () => {
    const dir = makeSkillDir("0.1.0")
    const beforeVersion = readFileSync(versionPath(dir), "utf8")
    const beforeChangelog = readFileSync(changelogPath(dir), "utf8")

    const res = run([SKILL, "patch", "--dry-run"], dir)
    expect(res.status).toBe(0)

    expect(readFileSync(versionPath(dir), "utf8")).toBe(beforeVersion)
    expect(readFileSync(changelogPath(dir), "utf8")).toBe(beforeChangelog)
  })
})

describe("release.sh changelog restructure", () => {
  test("previews the restructured changelog in dry-run", () => {
    const dir = makeSkillDir("0.1.0")
    const res = run([SKILL, "patch", "--dry-run"], dir)
    expect(res.status).toBe(0)

    const freshUnreleased = res.stdout.indexOf("## [Unreleased]")
    const dated = res.stdout.search(/## \[0\.1\.1\] — \d{4}-\d{2}-\d{2}/)
    const featureA = res.stdout.indexOf("- Feature A")
    const historical = res.stdout.indexOf("- Initial release")

    expect(freshUnreleased).toBeGreaterThanOrEqual(0)
    expect(dated).toBeGreaterThan(freshUnreleased)
    expect(featureA).toBeGreaterThan(dated)
    expect(historical).toBeGreaterThan(featureA)
  })

  test("writes the restructured changelog in production on main", () => {
    const dir = makeSkillDir("0.1.0")
    const gitEnv = {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    }
    for (const [k, v] of Object.entries(gitEnv)) {
      if (v === undefined) delete gitEnv[k]
    }

    const git = (args: string[]) =>
      spawnSync("git", args, { cwd: dir, encoding: "utf8", env: gitEnv })

    git(["init", "-q", "-b", "main"])
    git(["add", "-A"])
    git(["commit", "-q", "-m", "init"])

    const res = run([SKILL, "patch"], dir)
    expect(res.status).toBe(0)
    expect(res.stdout).toContain("old=0.1.0 new=0.1.1 tag=notes/v0.1.1")

    const written = readFileSync(changelogPath(dir), "utf8")
    expect(written).toMatch(/^## \[Unreleased\]/m)
    expect(written).toMatch(/## \[0\.1\.1\] — \d{4}-\d{2}-\d{2}/)
    expect(written).toContain("- Feature A")
    expect(written).toContain("- Initial release")
    expect(readFileSync(versionPath(dir), "utf8").trim()).toBe("0.1.1")

    const tags = git(["tag"]).stdout.trim()
    expect(tags).toContain("notes/v0.1.1")
  })

  test("refuses production release off main/master", () => {
    const dir = makeSkillDir("0.1.0")
    const gitEnv = {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    }
    const git = (args: string[]) =>
      spawnSync("git", args, { cwd: dir, encoding: "utf8", env: gitEnv })

    git(["init", "-q", "-b", "main"])
    git(["add", "-A"])
    git(["commit", "-q", "-m", "init"])
    git(["checkout", "-q", "-b", "feature/x"])

    const res = run([SKILL, "patch"], dir)
    expect(res.status).toBe(1)
    expect(res.stderr).toContain(
      "Releases must be created on master or main branch"
    )
  })
})
