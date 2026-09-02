import { type Plugin } from "@opencode-ai/plugin"
import { captureFinding, addProject, removeProject, listProjects } from "./tools"

const NotesPlugin: Plugin = async (ctx) => {
  return {
    tool: {
      capture_finding: captureFinding(ctx),
      add_project: addProject(),
      remove_project: removeProject(),
      list_projects: listProjects(),
    },
  }
}

export default NotesPlugin
