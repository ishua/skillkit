import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { addProject, removeProject, listProjects } from "../src/tools"
import { runTool, setupRegistryDir } from "./helpers"

describe("registry tools", () => {
  let cleanup: () => void
  let registryPath: string

  beforeEach(() => {
    const setup = setupRegistryDir("notes-tools-")
    cleanup = setup.cleanup
    registryPath = setup.registryPath
  })

  afterEach(() => {
    cleanup()
  })

  test("add_project writes entry and enforces single default", async () => {
    await runTool(addProject(), { name: "a", root: "/repo/a", default: true })
    await runTool(addProject(), { name: "b", root: "/repo/b", default: true })

    const raw = JSON.parse(readFileSync(registryPath, "utf8"))
    expect(raw.a.default).toBeUndefined()
    expect(raw.b.default).toBe(true)
  })

  test("add_project requires name and root", async () => {
    const r1 = await runTool(addProject(), { name: "", root: "/x" })
    const r2 = await runTool(addProject(), { name: "a", root: "" })
    expect(r1).toContain("Error")
    expect(r2).toContain("Error")
  })

  test("remove_project removes an existing project", async () => {
    await runTool(addProject(), { name: "a", root: "/repo/a" })
    const result = await runTool(removeProject(), { name: "a" })
    expect(result).toContain("removed")
    expect(JSON.parse(readFileSync(registryPath, "utf8"))).toEqual({})
  })

  test("remove_project errors when project not found", async () => {
    const result = await runTool(removeProject(), { name: "nope" })
    expect(result).toContain("Error")
    expect(result).toContain("not found")
  })

  test("list_projects returns registry as a JSON array of projects", async () => {
    await runTool(addProject(), { name: "a", root: "/repo/a", default: true })
    await runTool(addProject(), { name: "b", root: "/repo/b" })
    const result = await runTool(listProjects())
    const parsed = JSON.parse(result)
    expect(Array.isArray(parsed)).toBe(true)
    const a = parsed.find((p: any) => p.name === "a")
    expect(a.root).toBe("/repo/a")
    expect(a.default).toBe(true)
    const b = parsed.find((p: any) => p.name === "b")
    expect(b.root).toBe("/repo/b")
    expect(b.default).toBeUndefined()
  })
})
