import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { $ } from "bun"
import { spawnSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"
import { captureFinding } from "../src/tools"
import { saveRegistry } from "../src/registry"
import type { Registry } from "../src/types"
import type { PluginInput } from "@opencode-ai/plugin"
import { runTool, setupRegistryDir } from "./helpers"

/**
 * Integration test for the full routing chain:
 * registry -> conf/list -> substring alias match -> conf/add_task -> file write.
 * Uses a real (Python) fake project with real executable scripts, so the whole
 * contract is exercised end to end, exactly like a real project would provide.
 *
 * The suite requires a working `python3`; if it is missing the routing falls
 * back silently to the default project, which would mask a broken env, so the
 * tests are skipped instead.
 */
const HAS_PYTHON = spawnSync("python3", ["--version"]).status === 0

// The routing chain shells out per project, and each `conf/list` call can take
// up to LIST_TIMEOUT_MS (5s) to settle. bun's default 5s per-test timeout can
// therefore collide with the runtime deadline under parallel load and fail
// nondeterministically; give these end-to-end tests a generous ceiling.
const TEST_TIMEOUT_MS = 60_000

describe("capture_finding integration", () => {
  let dir: string
  let cleanup: () => void
  const ctx = { $ } as unknown as PluginInput

  function createProject(
    name: string,
    aliases: string[],
    inboxPath: string,
  ): string {
    const root = join(dir, name)
    const confDir = join(root, "conf")
    mkdirSync(confDir, { recursive: true })
    mkdirSync(join(root, "inbox"), { recursive: true })

    const aliasesJs = aliases.map((a) => JSON.stringify(a)).join(", ")
    writeFileSync(
      join(confDir, "list"),
      `#!/usr/bin/env python3
import json
aliases = [${aliasesJs}]
print(json.dumps({"aliases": aliases}))
`,
    )
    writeFileSync(
      join(confDir, "add_task"),
      `#!/usr/bin/env python3
import json, sys, os
data = json.load(sys.stdin)
out = ${JSON.stringify(inboxPath)}
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "a") as f:
    f.write("- %s \\u00b7 %s \\u00b7 %s\\n" % (data["date"], data["source"], data["text"]))
`,
    )
    chmodSync(join(confDir, "list"), 0o755)
    chmodSync(join(confDir, "add_task"), 0o755)
    return root
  }

  beforeEach(() => {
    const setup = setupRegistryDir("notes-int-")
    dir = setup.dir
    cleanup = setup.cleanup

    // Real project API scripts (executable), mirroring the notes contract.
    const defaultRoot = createProject(
      "fake-notes",
      [join(dir, "fake-notes"), join(dir, "fake-notes", "src")],
      join(dir, "fake-notes", "inbox", "common.md"),
    )
    createProject(
      "catalog-api",
      [join(dir, "catalog-api", "services", "api")],
      join(dir, "catalog-api", "inbox", "common.md"),
    )

    // Registry with the default project marked as fallback and a secondary
    // (non-default) project that must win via substring match alone.
    const registry: Registry = {}
    registry["fake-notes"] = { root: defaultRoot, default: true }
    registry["catalog-api"] = { root: join(dir, "catalog-api") }
    saveRegistry(registry)
  })

  afterEach(() => {
    cleanup()
  })

  test.skipIf(!HAS_PYTHON)(
    "routes a matching source through list -> add_task and writes the finding",
    async () => {
      const source = join(dir, "fake-notes", "src", "handlers", "route.go")
      const inbox = join(dir, "fake-notes", "inbox", "common.md")
      const result = await runTool(
        captureFinding({ ...ctx, directory: source } as PluginInput),
        { text: "found that the request timeout is hardcoded" },
      )

      expect(result).toBe(`Finding routed to fake-notes`)
      expect(existsSync(inbox)).toBe(true)
      const written = readFileSync(inbox, "utf8")
      expect(written).toContain(`· ${source} · found that the request timeout is hardcoded`)
      expect(written).toMatch(/^-\s*\d{4}-\d{2}-\d{2}\s·\s.+/m)
    },
    TEST_TIMEOUT_MS,
  )

  test.skipIf(!HAS_PYTHON)(
    "routes to a non-default project whose alias is a substring of the source",
    async () => {
      // Matches catalog-api's service alias but NOT fake-notes' aliases, so the
      // substring-match selection path (not default fallback) is exercised.
      const source = join(dir, "catalog-api", "services", "api", "handlers", "x.go")
      const inbox = join(dir, "catalog-api", "inbox", "common.md")
      const result = await runTool(
        captureFinding({ ...ctx, directory: source } as PluginInput),
        { text: "route me to catalog" },
      )

      expect(result).toBe(`Finding routed to catalog-api`)
      expect(existsSync(inbox)).toBe(true)
      const written = readFileSync(inbox, "utf8")
      expect(written).toContain(`· ${source} · route me to catalog`)
    },
    TEST_TIMEOUT_MS,
  )

  test.skipIf(!HAS_PYTHON)(
    "falls back to the default project for a non-matching source",
    async () => {
      const source = "/elsewhere/not/registered"
      const inbox = join(dir, "fake-notes", "inbox", "common.md")
      const result = await runTool(
        captureFinding({ ...ctx, directory: source } as PluginInput),
        { text: "some random idea" },
      )

      expect(result).toBe(`Finding routed to fake-notes`)
      expect(existsSync(inbox)).toBe(true)
      const written = readFileSync(inbox, "utf8")
      expect(written).toContain(`· ${source} · some random idea`)
    },
    TEST_TIMEOUT_MS,
  )
})
