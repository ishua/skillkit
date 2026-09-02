import { tool, type PluginInput } from "@opencode-ai/plugin"
import { spawn } from "node:child_process"
import { join } from "node:path"
import { loadRegistry } from "../registry"
import type { Registry } from "../types"

/**
 * Dependencies for routing used by `captureFinding`. Defaults run the real
 * project contracts; tests inject their own for mocking.
 */
export interface CaptureDeps {
  execList(ctx: PluginInput, root: string): Promise<string[]>
  execAddTask(root: string, payload: unknown): Promise<boolean>
}

/** Per-project `conf/list` deadline; prevents a hanging script from blocking. */
const LIST_TIMEOUT_MS = 5000

/** Length of the `YYYY-MM-DD` prefix of an ISO timestamp. */
const ISO_DATE_LENGTH = 10

/** Resolve with `timeout` after `ms` if `promise` does not settle first. */
function withTimeout<T>(promise: Promise<T>, ms: number, timeout: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(timeout), ms)
    promise
      .then((v) => {
        clearTimeout(timer)
        resolve(v)
      })
      .catch(() => {
        clearTimeout(timer)
        resolve(timeout)
      })
  })
}

/** Call a project's `conf/list` and extract its accepted source aliases. */
async function defaultExecList(
  ctx: PluginInput,
  root: string,
): Promise<string[]> {
  const out = await withTimeout(
    ctx
      .$`${join(root, "conf", "list")}`
      .cwd(root)
      .quiet()
      .nothrow()
      .text(),
    LIST_TIMEOUT_MS,
    "",
  )
  try {
    const parsed = JSON.parse(out)
    return Array.isArray(parsed.aliases) ? (parsed.aliases as string[]) : []
  } catch {
    return []
  }
}

/**
 * Deliver a finding to a project's `conf/add_task` via stdin.
 *
 * Uses node:child_process.spawn rather than the ctx `$` shell: the Bun shell
 * used by OpenCode does not expose a writable stdin on the command handle, so
 * piping the JSON payload through it is unreliable. spawn gives a real stdin.
 */
function defaultExecAddTask(root: string, payload: unknown): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(join(root, "conf", "add_task"), [], { cwd: root })
    child.on("error", () => resolve(false))
    child.on("exit", (code) => resolve(code === 0))
    // Guard against EPIPE/unhandled stream errors (e.g. child exits without
    // reading stdin) that would otherwise reject the unobserved stream.
    child.stdin.on("error", () => resolve(false))
    child.stdin.end(JSON.stringify(payload))
  })
}

export function captureFinding(
  ctx: PluginInput,
  deps: Partial<CaptureDeps> = {},
) {
  const execList = deps.execList ?? defaultExecList
  const execAddTask = deps.execAddTask ?? defaultExecAddTask

  return tool({
    description:
      "Route a finding (task, bug, idea) to the best-matching project in the notes registry " +
      "and record it there via that project's conf/add_task contract.",
    args: {
      text: tool.schema.string().describe("the finding text"),
    },
    async execute({ text }) {
      const registry = loadRegistry()
      const source = ctx.directory || process.cwd()
      const date = new Date().toISOString().slice(0, ISO_DATE_LENGTH)

      let target = defaultTarget(registry)
      for (const [name, project] of Object.entries(registry)) {
        const aliases = await execList(ctx, project.root)
        if (aliases.some((a) => a && source.includes(a))) {
          target = name
          break
        }
      }
      if (!target) return "No project available in registry"

      const ok = await execAddTask(registry[target].root, {
        date,
        source,
        text,
      })
      return ok
        ? `Finding routed to ${target}`
        : `Failed to route finding to ${target}`
    },
  })
}

function defaultTarget(registry: Registry): string | undefined {
  return Object.entries(registry).find(([, p]) => p.default)?.[0]
}
