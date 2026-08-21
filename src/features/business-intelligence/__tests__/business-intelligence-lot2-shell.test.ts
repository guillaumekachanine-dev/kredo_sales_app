import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Business Intelligence Lot 2 shell", () => {
  it("sépare les rendus catalogue et workspace Desktop/Mobile", () => {
    const page = read("src/app/(app)/intelligence/page.tsx")
    expect(page).toContain("SegmentCatalogLandingDesktop")
    expect(page).toContain("SegmentCatalogLandingMobile")
    expect(page).toContain("getDashboardDevice()")
    expect(page).not.toContain("getBusinessIntelligenceSnapshot()")
  })

  it("impose pendingSegment puis confirmation avant navigation", () => {
    for (const path of [
      "src/features/business-intelligence/catalog/SegmentCatalogLandingDesktop.tsx",
      "src/features/business-intelligence/catalog/SegmentCatalogLandingMobile.tsx",
    ]) {
      const source = read(path)
      expect(source).toContain("pendingSegment")
      expect(source).toContain("SegmentChangeConfirmDialog")
      expect(source).toContain("setPendingSegment(null)")
    }
    const confirm = read("src/features/business-intelligence/catalog/SegmentChangeConfirmDialog.tsx")
    expect(confirm).toContain("Activer ce segment")
  })

  it("charge le picker à la demande par Server Action", () => {
    const action = read("src/features/business-intelligence/actions/load-business-intelligence-catalog.ts")
    const picker = read("src/features/business-intelligence/catalog/SegmentPickerDialogDesktop.tsx")
    expect(action).toContain('"use server"')
    expect(action).toContain("getBusinessIntelligenceCatalog()")
    expect(picker).toContain("if (!open || catalog || requestStartedRef.current) return")
    expect(picker).toContain("requestStartedRef.current = true")
  })

  it("conserve l’ancien contexte pendant la transition", () => {
    for (const path of [
      "src/features/business-intelligence/desktop/BusinessIntelligenceDesktop.tsx",
      "src/features/business-intelligence/mobile/BusinessIntelligenceMobile.tsx",
    ]) {
      const source = read(path)
      expect(source).toContain("startSegmentTransition")
      expect(source).toContain("aria-busy")
      expect(source).toContain("workspace.segment.name")
      expect(source).toContain("Chargement du nouveau segment")
    }
  })
})
