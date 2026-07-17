import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Business Intelligence atelier analytique", () => {
  it("affiche la frise Desktop de cinq jalons et conserve les modales exhaustives", () => {
    const desktop = read("src/features/business-intelligence/desktop/BusinessIntelligenceDesktop.tsx")

    expect(desktop).toContain("<AccountPriorityBoard")
    expect(desktop).toContain("limit={5}")
    expect(desktop).toContain("<SectorWindowsTimeline")
    expect(desktop).toContain("onShowAll={() => setIsWindowsOpen(true)}")
    expect(desktop).toContain("windows={snapshot.windows}")
    expect(desktop).not.toContain("SectorWindowsLedger")
    expect(desktop).toContain("<PriorityAccountsModal")
    expect(desktop).toContain("<SectorWindowsModal")
    expect(desktop).not.toContain("SectorPanorama")
  })

  it("garde les trois modales accessibles au clavier via leurs cadres partagés", () => {
    const ledgers = read("src/features/business-intelligence/desktop/BusinessIntelligenceLedgerModals.tsx")
    const studies = read("src/features/business-intelligence/studies/SectorStudiesModal.tsx")
    const appDialog = read("src/components/ui/AppDialog.tsx")
    const splitDialog = read("src/components/intelligence/IntelligenceSplitModalShell.tsx")

    expect(ledgers.match(/<AppDialog/g)).toHaveLength(2)
    expect(ledgers).toContain('event.key === "Enter"')
    expect(appDialog).toContain('e.key !== "Escape"')
    expect(studies).toContain("<IntelligenceSplitModalShell")
    expect(splitDialog).toContain('event.key === "Escape"')
    expect(splitDialog).toContain("dialogFocusTrapDestination")
  })

  it("conserve les données métier et les états accessibles de la frise horizontale", () => {
    const timeline = read("src/features/business-intelligence/desktop/SectorWindowsTimeline.tsx")
    const ledgers = read("src/features/business-intelligence/desktop/BusinessIntelligenceLedgerModals.tsx")

    expect(timeline).toContain("SECTOR_ACTIVATION_SOURCE_LABELS")
    expect(timeline).toContain("À dater")
    expect(timeline).toContain("window.exposedAccountCount")
    expect(timeline).toContain("window.suggestedAction")
    expect(timeline).toContain("aria-pressed={isSelected}")
    expect(timeline).toContain("onSelectWindow(window)")
    expect(timeline).toContain("grid-rows-[auto_2rem_1rem_2rem_auto]")
    expect(timeline).toContain("const isUpper = index % 2 === 0")
    expect(timeline).toContain("groupWindowsByPeriod")
    expect(ledgers).toContain('mode="expanded"')
    expect(ledgers).not.toContain("min-w-[860px]")
  })

  it("préserve une matrice SVG lisible et une alternative textuelle", () => {
    const matrix = read("src/features/business-intelligence/desktop/PotentialReachMatrix.tsx")

    expect(matrix).toContain("<svg")
    expect(matrix).toContain("À activer")
    expect(matrix).toContain("À développer")
    expect(matrix).toContain("Valeurs détaillées de la matrice")
    expect(matrix).toContain("motion-reduce:transition-none")
  })
})
