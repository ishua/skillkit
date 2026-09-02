import { tool } from "@opencode-ai/plugin"
import { loadRegistry } from "../registry"

export function listProjects() {
  return tool({
    description: "List all projects in the notes registry as a JSON array.",
    args: {},
    async execute() {
      const registry = loadRegistry()
      return JSON.stringify(
        Object.entries(registry).map(([name, project]) => ({
          name,
          ...project,
        })),
      )
    },
  })
}
