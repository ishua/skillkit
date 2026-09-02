import { tool } from "@opencode-ai/plugin"
import { loadRegistry, saveRegistry } from "../registry"
import type { RemoveProjectParams } from "../types"

export function removeProject() {
  return tool({
    description: "Remove a project from the notes registry.",
    args: {
      name: tool.schema.string().describe("project name"),
    },
    async execute(args: RemoveProjectParams) {
      const registry = loadRegistry()
      if (!(args.name in registry)) {
        return `Error: Project '${args.name}' not found in registry`
      }
      delete registry[args.name]
      saveRegistry(registry)
      return `Project '${args.name}' removed from registry`
    },
  })
}
