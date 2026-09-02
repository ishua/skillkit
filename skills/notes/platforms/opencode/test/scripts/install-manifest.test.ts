import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve, sep } from "node:path"

const PLATFORM_DIR = resolve(import.meta.dir, "..", "..")
const MANIFEST_PATH = join(PLATFORM_DIR, "install-manifest.txt")

type CopyMode = "overwrite" | "if-missing"

interface ManifestEntry {
  source: string
  dest: string
  mode: CopyMode
}

function parseManifest(): ManifestEntry[] {
  const text = readFileSync(MANIFEST_PATH, "utf8")
  return text
    .split("\n")
    .filter((l) => l.trim().length > 0 && !l.trim().startsWith("#"))
    .map((l) => {
      const parts = l.split("::")
      if (parts.length < 2) throw new Error(`invalid manifest line (missing '::'): ${l}`)
      if (parts.length > 3) throw new Error(`invalid manifest line (too many '::'): ${l}`)
      const source = parts[0].trim()
      const dest = parts[1].trim()
      const mode = (parts[2] ? parts[2].trim() : "overwrite") as CopyMode
      if (mode !== "overwrite" && mode !== "if-missing") {
        throw new Error(`invalid manifest line (unknown mode '${mode}'): ${l}`)
      }
      return { source, dest, mode }
    })
}

describe("install manifest (notes/opencode)", () => {
  test("parses entries, ignoring comments and blank lines", () => {
    const text = readFileSync(MANIFEST_PATH, "utf8")
    const commented = text.split("\n").filter((l) => l.trim().startsWith("#"))
    expect(commented.length).toBeGreaterThan(0)

    const entries = parseManifest()
    expect(entries.length).toBeGreaterThan(0)
    for (const e of entries) {
      expect(e.source.length).toBeGreaterThan(0)
      expect(e.dest.length).toBeGreaterThan(0)
    }
  })

  test("every source file exists relative to the platform directory", () => {
    const entries = parseManifest()
    for (const e of entries) {
      const src = join(PLATFORM_DIR, e.source)
      expect(
        existsSync(src),
        `source file does not exist: ${e.source} (resolved to ${src})`,
      ).toBe(true)
    }
  })

  test("destinations are relative paths (no leading slash)", () => {
    const entries = parseManifest()
    for (const e of entries) {
      expect(e.dest.startsWith("/"), `dest must be relative: ${e.dest}`).toBe(false)
      expect(e.dest.split(sep)[0]).not.toMatch(/^[a-zA-Z]:$/)
    }
  })

  test("covers the required install destinations", () => {
    const dests = parseManifest().map((e) => e.dest)
    expect(dests).toContain("skill/notes/SKILL.md")
    expect(dests).toContain("plugins/notes.js")
    expect(dests).toContain("skill/notes/VERSION")
    expect(dests).toContain("skill/notes/registry.json")
  })

  test("registry template is copied to registry.json with if-missing mode", () => {
    const entry = parseManifest().find((e) => e.dest === "skill/notes/registry.json")
    expect(entry).toBeDefined()
    expect(entry!.source).toBe("registry.example.json")
    expect(entry!.mode).toBe("if-missing")
  })

  test("source paths stay inside the skill (no escaping the repo)", () => {
    // Resolve and ensure no source goes above the skill root into the repo.
    const skillRoot = resolve(PLATFORM_DIR, "..", "..")
    for (const e of parseManifest()) {
      const resolved = resolve(PLATFORM_DIR, e.source)
      expect(resolved.startsWith(skillRoot + sep), `escapes skill root: ${e.source}`).toBe(true)
    }
  })
})
