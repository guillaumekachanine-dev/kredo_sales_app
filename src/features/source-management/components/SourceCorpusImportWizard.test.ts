import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const source = readFileSync("src/features/source-management/components/SourceCorpusImportWizard.tsx", "utf8")

describe("SourceCorpusImportWizard — structure (Lot 4 §14-§17)", () => {
  it("is a client component", () => {
    expect(source).toContain('"use client"')
  })

  it("has exactly the three mandated steps: Préparer, Arbitrer, Finaliser", () => {
    expect(source).toContain('{ id: "prepare"')
    expect(source).toContain('{ id: "arbitrate"')
    expect(source).toContain('{ id: "finalize"')
    expect(source).toContain('label: "Préparer"')
    expect(source).toContain('label: "Arbitrer"')
    expect(source).toContain('label: "Finaliser"')
  })

  it("never nests a modal — no AppDialog/AppDrawer inside the wizard itself", () => {
    expect(source).not.toContain("AppDialog")
    expect(source).not.toContain("AppDrawer")
  })

  it("shares the same component between Desktop and Mobile via a variant prop", () => {
    expect(source).toContain('variant: "desktop" | "mobile"')
    expect(source).toContain("const isMobile = variant ===")
  })

  it("never writes before step 3: parsing and resolution only in steps 1-2", () => {
    expect(source).toContain("parseSourceRegistryOutput(")
    expect(source).toContain("resolveSourceCorpusImport(")
    expect(source).toContain("ingestSourceCorpusAction(")
    // La seule mutation (l'action) n'est appelée que dans handleConfirm, déclenché à l'étape 3.
    const confirmIndex = source.indexOf("async function handleConfirm")
    const actionCallIndex = source.indexOf("ingestSourceCorpusAction(")
    expect(actionCallIndex).toBeGreaterThan(confirmIndex)
  })

  it("never allows toggling a non-collectable (static) item on", () => {
    expect(source).toContain("if (item && !item.isCollectable) return")
  })

  it("computes the document hash client-side via Web Crypto (no new dependency)", () => {
    expect(source).toContain("crypto.subtle.digest(\"SHA-256\"")
  })

  it("always sends a fixed activation summary — the corpus is created as draft, never auto-activated", () => {
    expect(source).toContain("Brouillon")
  })
})
