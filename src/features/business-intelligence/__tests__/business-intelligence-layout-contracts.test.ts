import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Business Intelligence atelier analytique", () => {
  it("monte les chapitres analytiques mono-segment sur Desktop et conserve les modales", () => {
    const desktop = read("src/features/business-intelligence/desktop/BusinessIntelligenceDesktop.tsx")
    const prospectionDesktop = read("src/features/prospection-intelligence/desktop/ProspectionIntelligenceDesktop.tsx")

    expect(prospectionDesktop).toContain("<AccountPriorityBoard")
    expect(prospectionDesktop).toContain("limit={5}")
    expect(desktop).toContain("<RegulatoryCalendarChapterDesktop")
    expect(desktop).toContain("<SectorAnalysisChapterDesktop")
    expect(desktop).toContain("<CompetitiveEnvironmentWorkspace")
    expect(desktop).toContain("<BusinessIntelligenceSectorMapDesktop")
    expect(desktop).toContain("<SectorNewsChapterDesktop")
    expect(prospectionDesktop).toContain("<PriorityAccountsModal")
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
    expect(timeline).toContain("const TIMELINE_TONES")
    expect(timeline).toContain("bg-info/70")
    expect(timeline).toContain("bg-success/70")
    expect(timeline).toContain("hover:-translate-y-0.5")
    expect(ledgers).toContain('mode="expanded"')
    expect(ledgers).not.toContain("min-w-[860px]")
  })

  it("préserve une matrice SVG lisible et une alternative textuelle", () => {
    const matrix = read("src/features/business-intelligence/desktop/PotentialReachMatrix.tsx")

    expect(matrix).toContain("<svg")
    expect(matrix).toContain("Relation à élargir")
    expect(matrix).toContain("Dynamique établie")
    expect(matrix).toContain("Valeurs détaillées de la matrice")
    expect(matrix).toContain("motion-reduce:transition-none")
  })

  it("intègre la cartographie réelle dans l'onglet Chaîne de valeur sur Desktop et mobile", () => {
    const desktop = read("src/features/business-intelligence/desktop/BusinessIntelligenceDesktop.tsx")
    const mobile = read("src/features/business-intelligence/mobile/BusinessIntelligenceMobile.tsx")
    const page = read("src/app/(app)/intelligence/page.tsx")

    expect(desktop).toContain("<BusinessIntelligenceSectorMapDesktop")
    expect(desktop).not.toContain("Cette page accueillera la page /sector-mapping-value")
    expect(mobile).toContain("<BusinessIntelligenceSectorMapMobile")
    expect(mobile).toContain("BI_CHAPTERS.map")
    expect(mobile).toContain('activeChapter === "value-chain"')
    expect(page).toContain("getBusinessIntelligenceSegmentWorkspace(route.segmentId)")
    expect(page).not.toContain("getSectorMapCatalog()")
    expect(page).toContain("Promise.all")
  })
})
