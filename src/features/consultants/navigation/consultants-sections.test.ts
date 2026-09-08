import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  buildConsultantsSectionHref,
  CONSULTANTS_IN_SHELL_SECTIONS,
  CONSULTANTS_ROOT_SECTION,
  CONSULTANTS_SECTIONS,
  HEADER_TITLE_BY_SECTION,
  parseConsultantsSection,
  type ConsultantsSection,
} from "./consultants-sections"
import { ConsultantsDesktopShell } from "../desktop/ConsultantsDesktopShell"

const root = process.cwd()

const ALL_SECTIONS: ConsultantsSection[] = [
  "synthese",
  "collaborateurs",
  "activite-conges",
  "candidats",
  "pool-competences",
]

describe("consultants-sections — contrat de navigation", () => {
  describe("parseConsultantsSection", () => {
    it("résout null / undefined / vide vers l'état racine synthese", () => {
      expect(parseConsultantsSection(null)).toBe("synthese")
      expect(parseConsultantsSection(undefined)).toBe("synthese")
      expect(parseConsultantsSection("")).toBe("synthese")
    })

    it("résout les sections internalisées", () => {
      expect(parseConsultantsSection("collaborateurs")).toBe("collaborateurs")
      expect(parseConsultantsSection(["collaborateurs", "x"])).toBe("collaborateurs")
      expect(parseConsultantsSection("activite-conges")).toBe("activite-conges")
      expect(parseConsultantsSection("pool-competences")).toBe("pool-competences")
    })

    it("résout une section non encore internalisée ou inconnue vers synthese", () => {
      expect(parseConsultantsSection("candidats")).toBe("synthese")
      expect(parseConsultantsSection("invalide")).toBe("synthese")
    })
  })

  describe("buildConsultantsSectionHref", () => {
    it("omet le paramètre pour l'état racine", () => {
      expect(buildConsultantsSectionHref("synthese")).toBe("/consultants")
    })

    it("ajoute ?section= pour les autres chapitres internalisés", () => {
      expect(buildConsultantsSectionHref("collaborateurs")).toBe(
        "/consultants?section=collaborateurs",
      )
      expect(buildConsultantsSectionHref("activite-conges")).toBe(
        "/consultants?section=activite-conges",
      )
      expect(buildConsultantsSectionHref("pool-competences")).toBe(
        "/consultants?section=pool-competences",
      )
    })
  })

  describe("CONSULTANTS_SECTIONS", () => {
    it("liste les 5 chapitres dans l'ordre canonique", () => {
      expect(CONSULTANTS_SECTIONS.map((entry) => entry.key)).toEqual(ALL_SECTIONS)
    })

    it("internalise synthese, collaborateurs, activite-conges et pool-competences", () => {
      const inShell = CONSULTANTS_SECTIONS.filter((entry) => !entry.external).map(
        (entry) => entry.key,
      )
      expect(inShell).toEqual([...CONSULTANTS_IN_SHELL_SECTIONS])
      expect(inShell).toEqual([
        "synthese",
        "collaborateurs",
        "activite-conges",
        "pool-competences",
      ])
    })

    it("route les chapitres internalisés en ?section= et les externes vers leur route", () => {
      const byKey = Object.fromEntries(
        CONSULTANTS_SECTIONS.map((entry) => [entry.key, entry.href]),
      )
      expect(byKey["activite-conges"]).toBe("/consultants?section=activite-conges")
      expect(byKey["pool-competences"]).toBe("/consultants?section=pool-competences")
      expect(byKey["candidats"]).toBe("/recruitment")
    })

    it("expose un libellé de header pour chaque section", () => {
      for (const section of ALL_SECTIONS) {
        expect(HEADER_TITLE_BY_SECTION[section]).toBeTruthy()
      }
    })

    it("garde synthese comme racine canonique", () => {
      expect(CONSULTANTS_ROOT_SECTION).toBe("synthese")
    })
  })
})

describe("ConsultantsDesktopShell — conformité SHELL-0018", () => {
  function render(
    active: "synthese" | "collaborateurs" | "activite-conges" | "pool-competences",
  ) {
    return renderToStaticMarkup(
      React.createElement(
        ConsultantsDesktopShell,
        { activeSection: active },
        React.createElement("div", null, "contenu"),
      ),
    )
  }

  it("rend le chapeau navy avec le titre de page « Consultants »", () => {
    const markup = render("synthese")
    expect(markup).toContain("Consultants")
    expect(markup).toContain('href="/consultants"')
    expect(markup).toContain("w-[11.5rem]")
    expect(markup).toContain('aria-label="Navigation Consultants"')
  })

  it("affiche dans le header le libellé exact du chapitre actif", () => {
    expect(render("synthese")).toContain("Synthèse")
    expect(render("collaborateurs")).toContain("Collaborateurs")
    expect(render("activite-conges")).toContain("Activités &amp; congés")
    expect(render("pool-competences")).toContain("Pool de compétences")
  })

  it("rend les 5 chapitres avec leurs href", () => {
    const markup = render("collaborateurs")
    expect(markup).toContain('href="/consultants?section=collaborateurs"')
    expect(markup).toContain('href="/consultants?section=activite-conges"')
    expect(markup).toContain('href="/consultants?section=pool-competences"')
    expect(markup).toContain('href="/recruitment"')
  })

  it("marque le chapitre actif avec aria-current=page", () => {
    const markup = render("collaborateurs")
    expect(markup).toContain('aria-current="page"')
  })

  it("ne rend aucune section Modules (aucun module contextuel disponible)", () => {
    expect(render("synthese")).not.toContain(">Modules<")
  })
})

describe("Consultants Workspace — invariants de code", () => {
  const pageSource = readFileSync(
    resolve(root, "src/app/(app)/consultants/page.tsx"),
    "utf8",
  )
  const layoutSource = readFileSync(
    resolve(root, "src/app/(app)/consultants/layout.tsx"),
    "utf8",
  )
  const tabbedLayoutSource = readFileSync(
    resolve(root, "src/app/(app)/consultants/(tabbed)/layout.tsx"),
    "utf8",
  )

  it("la page résout la section depuis l'URL, pas depuis un useState", () => {
    expect(pageSource).toContain("parseConsultantsSection")
    expect(pageSource).not.toContain("useState")
  })

  it("le layout racine n'importe ni ne rend plus SectionNavBarSlot", () => {
    expect(layoutSource).not.toContain("import { SectionNavBarSlot }")
    expect(layoutSource).not.toContain("<SectionNavBarSlot")
  })

  it("le layout (tabbed) conserve SectionNavBarSlot pour les routes historiques", () => {
    expect(tabbedLayoutSource).toContain("import { SectionNavBarSlot }")
    expect(tabbedLayoutSource).toContain("<SectionNavBarSlot")
  })
})
