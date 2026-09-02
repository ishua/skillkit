import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { getRegistryPath, loadRegistry, saveRegistry, INSTALLED_REGISTRY_PATH } from "../src/registry"
import { setupRegistryDir } from "./helpers"

describe("notes registry", () => {
  let registryPath: string
  let cleanup: () => void

  beforeEach(() => {
    const setup = setupRegistryDir("notes-test-")
    registryPath = setup.registryPath
    cleanup = setup.cleanup
  })

  afterEach(() => {
    cleanup()
  })

  test("getRegistryPath honors NOTES_REGISTRY_PATH override", () => {
    expect(getRegistryPath()).toBe(registryPath)
  })

  test("getRegistryPath defaults to installed skill location", () => {
    delete process.env.NOTES_REGISTRY_PATH
    expect(getRegistryPath()).toBe(INSTALLED_REGISTRY_PATH)
  })

  test("loadRegistry returns empty object when file is missing", () => {
    expect(loadRegistry()).toEqual({})
  })

  test("saveRegistry writes file and loadRegistry reads it back", () => {
    const registry = { notes: { root: "/repo/notes", default: true } }
    saveRegistry(registry)
    expect(existsSync(registryPath)).toBe(true)
    expect(JSON.parse(readFileSync(registryPath, "utf8"))).toEqual(registry)
    expect(loadRegistry()).toEqual(registry)
  })

  test("loadRegistry returns empty object on malformed JSON", () => {
    writeFileSync(registryPath, "not json")
    expect(loadRegistry()).toEqual({})
  })
})
