import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { useModuleSnapshot } from "../use-module-snapshot"

describe("useModuleSnapshot — Type & Invariant contracts", () => {
  const fileSource = readFileSync("src/components/intelligence/modules/use-module-snapshot.ts", "utf8")

  it("exports useModuleSnapshot, ModuleSnapshotState, and ModuleSnapshotController", () => {
    expect(typeof useModuleSnapshot).toBe("function")
    expect(fileSource).toContain("export type ModuleSnapshotState<T>")
    expect(fileSource).toContain("export type ModuleSnapshotController<T>")
  })

  it("exposes state, refresh, and updateData in the controller return contract", () => {
    expect(fileSource).toContain("refresh: (options?: { silent?: boolean }) => Promise<void>")
    expect(fileSource).toContain("updateData: (updater: (current: T) => T) => void")
  })

  it("implements silent refresh preserving previous data while loading", () => {
    expect(fileSource).toContain("const isSilent = options?.silent ?? (stateRef.current.status === \"ready\")")
    expect(fileSource).toContain("if (!isSilent) {")
    expect(fileSource).toContain('setState({ status: "loading" })')
  })

  it("preserves displayed ready snapshot if silent refresh encounters an error", () => {
    expect(fileSource).toContain('if (isSilent && stateRef.current.status === "ready") {')
    expect(fileSource).toContain("return")
  })

  it("invalidates stale in-flight server requests when updateData is applied", () => {
    expect(fileSource).toContain("requestIdRef.current += 1")
  })
})
