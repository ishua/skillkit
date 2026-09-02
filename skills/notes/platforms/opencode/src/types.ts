/**
 * A single project registered with the notes skill.
 *
 * `default: true` marks the fallback project that receives findings
 * when no project's aliases match the source. At most one project is
 * marked as default at a time.
 */
export interface Project {
  /** Absolute path to the project root; API scripts live at `<root>/conf/`. */
  root: string
  /** Whether this project is the default fallback target. */
  default?: boolean
}

/** Registry of known projects, keyed by project name. */
export type Registry = Record<string, Project>

/** Parameters for the `add_project` tool. */
export interface AddProjectParams {
  name: string
  root: string
  default?: boolean
}

/** Parameters for the `remove_project` tool. */
export interface RemoveProjectParams {
  name: string
}
