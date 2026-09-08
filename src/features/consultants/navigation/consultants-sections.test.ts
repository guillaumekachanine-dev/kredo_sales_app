import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  buildConsultantsModuleHref,
  buildConsultantsSectionHref,
  CONSULTANTS_IN_SHELL_SECTIONS,
  CONSULTANTS_ROOT_SECTION,
  CONSULTANTS_SECTIONS,
  HEADER_TITLE_BY_SECTION,
  parseConsultantsModule,
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
      expect(parseConsultantsSection("candidats")).toBe("candidats")
      expect(parseConsultantsSection("pool-competences")).toBe("pool-competences")
    })

    it("résout une section inconnue vers synthese", () => {
      expect(parseConsultantsSection("invalide")).toBe("synthese")
      expect(parseConsultantsSection("recrutement")).toBe("synthese")
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
      expect(buildConsultantsSectionHref("candidats")).toBe(
        "/consultants?section=candidats",
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

    it("internalise les 5 chapitres dans le shell (aucune section externe)", () => {
      const inShell = CONSULTANTS_SECTIONS.filter((entry) => !entry.external).map(
        (entry) => entry.key,
      )
      expect(inShell).toEqual([...CONSULTANTS_IN_SHELL_SECTIONS])
      expect(inShell).toEqual([...ALL_SECTIONS])
      expect(CONSULTANTS_SECTIONS.every((entry) => !entry.external)).toBe(true)
    })

    it("route tous les chapitres internalisés en ?section=", () => {
      const byKey = Object.fromEntries(
        CONSULTANTS_SECTIONS.map((entry) => [entry.key, entry.href]),
      )
      expect(byKey["activite-conges"]).toBe("/consultants?section=activite-conges")
      expect(byKey["pool-competences"]).toBe("/consultants?section=pool-competences")
      expect(byKey["candidats"]).toBe("/consultants?section=candidats")
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
    active:
      | "synthese"
      | "collaborateurs"
      | "activite-conges"
      | "candidats"
      | "pool-competences",
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
    expect(render("candidats")).toContain("Candidats")
    expect(render("pool-competences")).toContain("Pool de compétences")
  })

  it("rend les 5 chapitres avec leurs href ?section=", () => {
    const markup = render("collaborateurs")
    expect(markup).toContain('href="/consultants?section=collaborateurs"')
    expect(markup).toContain('href="/consultants?section=activite-conges"')
    expect(markup).toContain('href="/consultants?section=candidats"')
    expect(markup).toContain('href="/consultants?section=pool-competences"')
    expect(markup).not.toContain('href="/recruitment"')
  })

  it("marque le chapitre actif avec aria-current=page", () => {
    const markup = render("collaborateurs")
    expect(markup).toContain('aria-current="page"')
  })

  it("rend la section Modules avec Production & Congés et Matching profil (Lot 13)", () => {
    const markup = render("synthese")
    expect(markup).toContain("Modules")
    expect(markup).toContain("Production &amp; Congés")
    expect(markup).toContain('href="/consultants?module=production-conges"')
    expect(markup).toContain("Matching profil")
    expect(markup).toContain('href="/consultants?module=matching-profil"')
  })

  it("génère l'URL correcte du module pour les sections avec query param", () => {
    const markup = render("collaborateurs")
    expect(markup).toContain('href="/consultants?section=collaborateurs&amp;module=production-conges"')
    expect(markup).toContain('href="/consultants?section=collaborateurs&amp;module=matching-profil"')
  })
})

describe("consultants-sections — modules contextuels", () => {
  it("parseConsultantsModule résout 'production-conges', 'matching-profil' et ignore les valeurs inconnues", () => {
    expect(parseConsultantsModule("production-conges")).toBe("production-conges")
    expect(parseConsultantsModule(["production-conges"])).toBe("production-conges")
    expect(parseConsultantsModule("matching-profil")).toBe("matching-profil")
    expect(parseConsultantsModule(["matching-profil"])).toBe("matching-profil")
    expect(parseConsultantsModule("matching")).toBeNull()
    expect(parseConsultantsModule(null)).toBeNull()
    expect(parseConsultantsModule(undefined)).toBeNull()
  })

  it("buildConsultantsModuleHref construit le lien avec module et optionnellement person en préservant la section", () => {
    expect(buildConsultantsModuleHref("synthese", "production-conges")).toBe(
      "/consultants?module=production-conges",
    )
    expect(buildConsultantsModuleHref("collaborateurs", "production-conges")).toBe(
      "/consultants?section=collaborateurs&module=production-conges",
    )
    expect(buildConsultantsModuleHref("candidats", "matching-profil", "person-123")).toBe(
      "/consultants?section=candidats&module=matching-profil&person=person-123",
    )
    expect(buildConsultantsModuleHref("synthese", null)).toBe("/consultants")
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
