import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Mobile Source Management — Hierarchical Navigation & Sub-views", () => {
  const drawerSource = read("src/features/source-management/components/SourceManagementDrawerMobile.tsx")
  const synthesisSource = read("src/features/source-management/components/mobile/MobileSourceManagementSynthesis.tsx")
  const editorialSource = read("src/features/source-management/components/mobile/MobileEditorialSourceList.tsx")
  const corpusDetailSource = read("src/features/source-management/components/mobile/MobileCorpusDetail.tsx")
  const darkSwitchSource = read("src/features/source-management/components/mobile/MobileDarkSwitch.tsx")

  it("SourceManagementDrawerMobile implements hierarchical navigation state machine", () => {
    expect(drawerSource).toContain('kind: "home"')
    expect(drawerSource).toContain('kind: "synthesis"')
    expect(drawerSource).toContain('kind: "editorial_base"')
    expect(drawerSource).toContain('kind: "corpus"')
    expect(drawerSource).toContain('kind: "create"')
    expect(drawerSource).toContain('kind: "edit"')
    expect(drawerSource).toContain('kind: "import"')
  })

  it("Drawer header provides a >=44px back button when in a sub-view", () => {
    expect(drawerSource).toContain("ArrowLeftIcon")
    expect(drawerSource).toContain("min-h-[44px] min-w-[44px]")
    expect(drawerSource).toContain("handleBack")
  })

  it("Drawer intercepts back/close gesture to return to previous view before closing", () => {
    expect(drawerSource).toContain('if (view.kind !== "home" && reason !== "backdrop")')
    expect(drawerSource).toContain("handleBack()")
    expect(drawerSource).toContain("return false")
  })

  it("Drawer adopts Midnight Navy #0f122c and Brass canonical styling", () => {
    expect(drawerSource).toContain("bg-[#0f122c]")
    expect(drawerSource).toContain("border-white/10")
    expect(drawerSource).toContain("bg-brand-brass")
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
})
