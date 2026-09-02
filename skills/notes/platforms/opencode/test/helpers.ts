import type { ToolContext, ToolDefinition, ToolResult } from "@opencode-ai/plugin"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/**
 * Point the runtime registry at a fresh temp dir and restore the environment
 * afterwards. The caller must register `cleanup` in an afterEach hook.
 */
export function setupRegistryDir(prefix = "notes-test-"): {
  dir: string
  registryPath: string
  cleanup: () => void
} {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  const registryPath = join(dir, "registry.json")
  const originalEnv = process.env.NOTES_REGISTRY_PATH
  process.env.NOTES_REGISTRY_PATH = registryPath
  const cleanup = () => {
    rmSync(dir, { recursive: true, force: true })
    if (originalEnv === undefined) delete process.env.NOTES_REGISTRY_PATH
    else process.env.NOTES_REGISTRY_PATH = originalEnv
  }
  return { dir, registryPath, cleanup }
}

/** Minimal ToolContext; the tools under test only read it through closure. */
const baseContext: ToolContext = {
  sessionID: "test",
  messageID: "test",
  agent: "test",
  directory: "/",
  worktree: "/",
  abort: new AbortController().signal,
  metadata: () => {},
  ask: async () => {},
}

/**
 * Invoke a plugin tool's `execute` with a typed args object and a default
 * context, so tests never reach around the type system or pass a magic `{}`.
 */
export function runTool<Tool extends ToolDefinition>(
  toolDef: Tool,
  args: Parameters<Tool["execute"]>[0] = {} as Parameters<Tool["execute"]>[0],
  context: Partial<ToolContext> = {},
): Promise<ToolResult> {
  return toolDef.execute(args, { ...baseContext, ...context } as ToolContext)
}
