import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("Digest Launch UI Components (Desktop and Mobile)", () => {
  const desktopCode = readFileSync(
    resolve(root, "src/features/veille/digest/components/DigestLaunchDialogDesktop.tsx"),
    "utf8",
  )
  const mobileCode = readFileSync(
    resolve(root, "src/features/veille/digest/components/DigestLaunchSheetMobile.tsx"),
    "utf8",
  )

  describe("DigestLaunchDialogDesktop", () => {
    it("uses AppDialog with exact title and two distinct sections (Sujet and Corpus)", () => {
      expect(desktopCode).toContain("<AppDialog")
      expect(desktopCode).toContain('title="Générer un digest"')
      expect(desktopCode).toContain("1. Sujet")
      expect(desktopCode).toContain("2. Corpus de sources")
    })

    it("displays thematic topics and dynamic segments", () => {
      expect(desktopCode).toContain("Thématiques")
      expect(desktopCode).toContain("Segments métier")
      expect(desktopCode).toContain("thematicTopics.map")
      expect(desktopCode).toContain("segmentTopics.map")
    })

    it("displays default socle sources and explicit corpus groups", () => {
      expect(desktopCode).toContain("Sources KREDO par défaut")
      expect(desktopCode).toContain("options.defaultSourcesCount")
      expect(desktopCode).toContain("thematicCorpora.map")
      expect(desktopCode).toContain("sectorCorpora.map")
    })

    it("renders unselectable corpora with visible disabled state and reason", () => {
      expect(desktopCode).toContain("disabled={!isSelectable}")
      expect(desktopCode).toContain("corpus.unavailableReason")
      expect(desktopCode).toContain("cursor-not-allowed")
    })

    it("shows compact summary at the bottom before CTA", () => {
      expect(desktopCode).toContain("Sujet")
      expect(desktopCode).toContain("Corpus")
      expect(desktopCode).toContain("Sources")
      expect(desktopCode).toContain("Générer le digest")
    })

    it("blocks CTA when disabled or launching, and displays errors", () => {
      expect(desktopCode).toContain("disabled={disabled || isLaunching}")
      expect(desktopCode).toContain("loading={isLaunching}")
      expect(desktopCode).toContain('role="alert"')
    })
  })

  describe("DigestLaunchSheetMobile", () => {
    it("is a dedicated mobile component using AppDrawer with side bottom", () => {
      expect(mobileCode).toContain("<AppDrawer")
      expect(mobileCode).toContain('side="bottom"')
      expect(mobileCode).not.toContain("<AppDialog")
    })

    it("implements a two-step flow (Step 1: Sujet, Step 2: Sources)", () => {
      expect(mobileCode).toContain("const [step, setStep] = useState<1 | 2>(1)")
      expect(mobileCode).toContain("Étape 1/2 : Choisissez le sujet")
      expect(mobileCode).toContain("Étape 2/2 : Choisissez les sources")
    })

    it("allows navigation back to Step 1 without closing the sheet", () => {
      expect(mobileCode).toContain("onClick={() => setStep(1)}")
      expect(mobileCode).toContain("Modifier le sujet sélectionné")
    })

    it("ensures all touch targets satisfy the min 44px requirement", () => {
      expect(mobileCode).toContain("min-h-[52px]")
      expect(mobileCode).toContain("min-h-[48px]")
      expect(mobileCode).toContain("min-h-[44px]")
    })

    it("provides a full-width CTA in step 2 with summary", () => {
      expect(mobileCode).toContain('fullWidth')
      expect(mobileCode).toContain("Générer le digest")
      expect(mobileCode).toContain("disabled={disabled || isLaunching}")
    })

    it("renders unselectable corpora disabled with clear reasons", () => {
      expect(mobileCode).toContain("disabled={!isSelectable}")
      expect(mobileCode).toContain("corpus.unavailableReason")
    })
  })
})
