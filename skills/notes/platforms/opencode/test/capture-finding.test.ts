import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { captureFinding, type CaptureDeps } from "../src/tools"
import { saveRegistry } from "../src/registry"
import type { Registry } from "../src/types"
import type { PluginInput } from "@opencode-ai/plugin"
import { runTool, setupRegistryDir } from "./helpers"

/**
 * Mock exec dependencies for the routing logic: `execList` returns aliases per
 * project root and `execAddTask` records the payload, mirroring real scripts.
 */
function mockDeps(opts: {
  aliasesByRoot?: Record<string, string[]>
  addOk?: boolean
}) {
  const aliasesByRoot = opts.aliasesByRoot ?? {}
  const addOk = opts.addOk ?? true
  const sentPayloads: Array<Record<string, string>> = []

  const deps: Partial<CaptureDeps> = {
    async execList(_ctx, root) {
      return aliasesByRoot[root] ?? []
    },
    async execAddTask(_root, payload) {
      sentPayloads.push(payload as Record<string, string>)
      return addOk
    },
  }
  return { deps, sentPayloads }
}

describe("capture_finding tool", () => {
  let cleanup: () => void
  const ctx = {} as PluginInput

  beforeEach(() => {
    ;({ cleanup } = setupRegistryDir("notes-capture-"))
  })

  afterEach(() => {
    cleanup()
  })

  test("routes to the project whose alias matches the source", async () => {
    saveRegistry({
      notes: { root: "/f/proj/notes", default: true },
      "catalog-api": { root: "/f/proj/catalog" },
    } as Registry)
    const { deps, sentPayloads } = mockDeps({
      aliasesByRoot: {
        "/f/proj/notes": ["/f/proj/notes"],
        "/f/proj/catalog": ["/f/proj/catalog"],
      },
    })

    const result = await runTool(
      captureFinding(
        { ...ctx, directory: "/f/proj/catalog/handlers/route.go" } as PluginInput,
        deps,
      ),
      { text: "found a bug" },
    )

    expect(result).toBe("Finding routed to catalog-api")
    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0]).toMatchObject({
      source: "/f/proj/catalog/handlers/route.go",
      text: "found a bug",
    })
    expect(sentPayloads[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test("falls back to the default project when no alias matches", async () => {
    saveRegistry({
      notes: { root: "/f/proj/notes", default: true },
      "catalog-api": { root: "/f/proj/catalog" },
    } as Registry)
    const { deps, sentPayloads } = mockDeps({
      aliasesByRoot: {
        "/f/proj/notes": ["/f/proj/notes"],
        "/f/proj/catalog": ["/f/proj/catalog"],
      },
    })

    const result = await runTool(
      captureFinding(
        { ...ctx, directory: "/totally/unrelated/path" } as PluginInput,
        deps,
      ),
      { text: "an idea" },
    )

    expect(result).toBe("Finding routed to notes")
    expect(sentPayloads).toHaveLength(1)
    expect(sentPayloads[0].text).toBe("an idea")
  })

  test("returns an error when add_task exits non-zero", async () => {
    saveRegistry({
      notes: { root: "/f/proj/notes", default: true },
    } as Registry)
    const { deps } = mockDeps({
      aliasesByRoot: { "/f/proj/notes": ["/f/proj/notes"] },
      addOk: false,
    })

    const result = await runTool(
      captureFinding(
        { ...ctx, directory: "/f/proj/notes/x" } as PluginInput,
        deps,
      ),
      { text: "boom" },
    )

    expect(result).toBe("Failed to route finding to notes")
  })

  test("returns an error when no default project and nothing matches", async () => {
    saveRegistry({
      "catalog-api": { root: "/f/proj/catalog" },
    } as Registry)
    const { deps } = mockDeps({
      aliasesByRoot: { "/f/proj/catalog": ["/f/proj/catalog"] },
    })

    const result = await runTool(
      captureFinding(
        { ...ctx, directory: "/unrelated" } as PluginInput,
        deps,
      ),
      { text: "orphan" },
    )

    expect(result).toBe("No project available in registry")
  })
})

