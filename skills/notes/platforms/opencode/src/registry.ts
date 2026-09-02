import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import type { Registry } from "./types"

// Suffix for the temporary file written before the atomic rename.
const TMP_SUFFIX = ".tmp"

/**
 * Resolve the registry file path.
 *
 * The repo-root `registry.json` is only a seed used by install.sh — it is
 * never read at runtime. The runtime registry lives next to the installed
 * skill. `NOTES_REGISTRY_PATH` overrides the location for tests.
 *
 * This resolved path must match the `install-manifest.txt` dest so an installed
 * skill locates the same runtime registry.json the manifest seeds.
 */
export const INSTALLED_REGISTRY_PATH = join(
  homedir(),
  ".config",
  "opencode",
  "skill",
  "notes",
  "registry.json",
)

export function getRegistryPath(): string {
  return process.env.NOTES_REGISTRY_PATH ?? INSTALLED_REGISTRY_PATH
}

/** Load the registry, returning an empty object if it is missing or invalid. */
export function loadRegistry(): Registry {
  const path = getRegistryPath()
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Registry
  } catch {
    // Fall back to an empty registry but surface the corrupted file so the
    // problem is not silently masked (e.g. after a partial/crashy write).
    console.error(`notes: failed to parse registry at ${path}; treating as empty`)
    return {}
  }
}

/**
 * Persist the registry to disk, creating parent directories as needed.
 *
 * Written atomically (temp file + rename) so a crash or concurrent read never
 * observes a truncated/corrupt file in place. Note: concurrent read-modify-write
 * cycles can still clobber each other's entries — tool invocations are expected
 * to be infrequent, so no cross-process locking is applied.
 */
export function saveRegistry(registry: Registry): void {
  const path = getRegistryPath()
  mkdirSync(dirname(path), { recursive: true })
  const tmp = `${path}${TMP_SUFFIX}`
  writeFileSync(tmp, JSON.stringify(registry, null, 2) + "\n")
  renameSync(tmp, path)
}
