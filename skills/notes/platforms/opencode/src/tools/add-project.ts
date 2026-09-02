import { tool } from "@opencode-ai/plugin"
import { loadRegistry, saveRegistry } from "../registry"
import type { AddProjectParams, Project } from "../types"

export function addProject() {
  return tool({
    description:
      "Add or update a project in the notes registry. Enforces a single default project.",
    args: {
      name: tool.schema.string().describe("project name"),
      root: tool.schema.string().describe("absolute path to the project root"),
      default: tool.schema
        .boolean()
        .optional()
        .describe("mark this project as the default fallback target"),
    },
    async execute(args: AddProjectParams) {
      if (!args.name.trim()) return "Error: project name is required"
      if (!args.root.trim()) return "Error: project root is required"
      // Relative roots silently break the conf/list + conf/add_task exec later.
      if (!args.root.startsWith("/")) {
        return "Error: project root must be an absolute path"
      }

      const registry = loadRegistry()
      const project: Project = {
        root: args.root,
        ...(args.default ? { default: true } : {}),
      }
      if (args.default) {
        for (const p of Object.values(registry)) delete p.default
      }
      registry[args.name] = project
      saveRegistry(registry)
      return `Project '${args.name}' added to registry`
    },
  })
}
