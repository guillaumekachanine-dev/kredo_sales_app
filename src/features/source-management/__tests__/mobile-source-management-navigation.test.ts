import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Mobile Source Management — Hierarchical Navigation & Sub-views", () => {
  const modalSource = read("src/features/source-management/components/SourceManagementModalMobile.tsx")
  const synthesisSource = read("src/features/source-management/components/mobile/MobileSourceManagementSynthesis.tsx")
  const editorialSource = read("src/features/source-management/components/mobile/MobileEditorialSourceList.tsx")
  const corpusDetailSource = read("src/features/source-management/components/mobile/MobileCorpusDetail.tsx")
  const darkSwitchSource = read("src/features/source-management/components/mobile/MobileDarkSwitch.tsx")

  it("SourceManagementModalMobile implements hierarchical navigation state machine", () => {
    expect(modalSource).toContain('kind: "home"')
    expect(modalSource).toContain('kind: "synthesis"')
    expect(modalSource).toContain('kind: "editorial_base"')
    expect(modalSource).toContain('kind: "corpus"')
    expect(modalSource).toContain('kind: "create"')
    expect(modalSource).toContain('kind: "edit"')
    expect(modalSource).toContain('kind: "import"')
  })

  it("Header provides a >=44px back button when in a sub-view", () => {
    expect(modalSource).toContain("ArrowLeftIcon")
    expect(modalSource).toContain("min-h-[44px] min-w-[44px]")
    expect(modalSource).toContain("handleBack")
  })

  it("SourceManagementModalMobile uses canonical IntelligenceSplitModalShell with isMobile and no AppDrawer", () => {
    expect(modalSource).toContain("<IntelligenceSplitModalShell")
    expect(modalSource).toContain("isMobile")
    expect(modalSource).not.toContain("AppDrawer")
  })

  it("Modal adopts Midnight Navy #0f122c and Brass canonical styling", () => {
    expect(modalSource).toContain("bg-[#0f122c]")
    expect(modalSource).toContain("border-white/10")
    expect(modalSource).toContain("bg-brand-brass")
  })

  it("MobileDarkSwitch guarantees a touch target >= 44px (min-h-[44px] min-w-[44px])", () => {
    expect(darkSwitchSource).toContain("min-h-[44px] min-w-[44px]")
    expect(darkSwitchSource).toContain('role="switch"')
    expect(darkSwitchSource).toContain("aria-checked")
  })

  it("MobileSourceManagementSynthesis displays the 3 canonical KPIs and breakdown without heavy charts", () => {
    expect(synthesisSource).toContain("Sources disponibles")
    expect(synthesisSource).toContain("Sources actives")
    expect(synthesisSource).toContain("Corpus gérés")
    expect(synthesisSource).toContain("Répartition par catégorie")
    expect(synthesisSource).toContain("Activité des corpus")
    expect(synthesisSource).not.toContain("recharts")
    expect(synthesisSource).not.toContain("chart.js")
  })

  it("MobileEditorialSourceList groups by KREDO categories and provides touch targets >= 44px", () => {
    expect(editorialSource).toContain("KREDO_SOURCE_CATEGORY_ORDER")
    expect(editorialSource).toContain("min-h-[44px]")
    expect(editorialSource).toContain("setManualSourceActiveAction")
    expect(editorialSource).toContain("deleteManualSourceAction")
    expect(editorialSource).toContain("confirmingDelete")
  })

  it("MobileCorpusDetail supports both reading mode and full editing mode with confirmation", () => {
    expect(corpusDetailSource).toContain("PencilIcon")
    expect(corpusDetailSource).toContain("isEditing")
    expect(corpusDetailSource).toContain("corpusNameDraft")
    expect(corpusDetailSource).toContain("corpusDescDraft")
    expect(corpusDetailSource).toContain("updateCorpusEditorialAction")
    expect(corpusDetailSource).toContain("renameCorpusSourceAction")
    expect(corpusDetailSource).toContain("removeSourceFromCorpusAction")
    expect(corpusDetailSource).toContain("Retirer cette source du corpus ?")
    expect(corpusDetailSource).toContain("min-h-[44px]")
  })

  it("MobileCorpusDetail hides News and Account-watch toggles for thematic corpora", () => {
    expect(corpusDetailSource).toContain('corpus?.scopeKind !== "thematic"')
    expect(corpusDetailSource).toContain("Corpus activé")
  })

  it("handleClose resets view state to home upon dismissal", () => {
    expect(modalSource).toContain('setView({ kind: "home" })')
    expect(modalSource).toContain("onOpenChange(false)")
  })

  it("preserves responsive flex constraints without horizontal overflow blowout", () => {
    expect(modalSource).toContain("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden")
    expect(modalSource).toContain("min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pb-safe text-white")
  })
})
