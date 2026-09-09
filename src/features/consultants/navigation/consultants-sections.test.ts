import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  buildConsultantsModuleHref,
  buildConsultantsSectionHref,
  CONSULTANTS_CONTEXTUAL_MODULES,
  CONSULTANTS_DESKTOP_CHAPTERS,
  CONSULTANTS_DESKTOP_CHAPTER_KEYS,
  CONSULTANTS_IN_SHELL_SECTIONS,
  CONSULTANTS_ROOT_SECTION,
  CONSULTANTS_SECTIONS,
  HEADER_TITLE_BY_SECTION,
  parseConsultantsModule,
  parseConsultantsSection,
  resolveConsultantsDesktopEntry,
  type ConsultantsDesktopChapter,
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

const DESKTOP_CHAPTERS: ConsultantsDesktopChapter[] = [
  "synthese",
  "collaborateurs",
  "activite-conges",
  "candidats",
]

describe("consultants-sections — contrat de navigation", () => {
  describe("parseConsultantsSection", () => {
    it("résout null / undefined / vide vers l'état racine synthese", () => {
      expect(parseConsultantsSection(null)).toBe("synthese")
      expect(parseConsultantsSection(undefined)).toBe("synthese")
      expect(parseConsultantsSection("")).toBe("synthese")
    })

    it("résout les 5 sections adressables (Mobile + compat)", () => {
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

    it("ajoute ?section= pour les autres sections", () => {
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

  describe("CONSULTANTS_SECTIONS (Mobile + compat) — 5 entrées", () => {
    it("liste les 5 sections dans l'ordre canonique", () => {
      expect(CONSULTANTS_SECTIONS.map((entry) => entry.key)).toEqual(ALL_SECTIONS)
    })

    it("garde les 5 sections internalisées (aucune section externe)", () => {
      const inShell = CONSULTANTS_SECTIONS.filter((entry) => !entry.external).map(
        (entry) => entry.key,
      )
      expect(inShell).toEqual([...CONSULTANTS_IN_SHELL_SECTIONS])
      expect(inShell).toEqual([...ALL_SECTIONS])
      expect(CONSULTANTS_SECTIONS.every((entry) => !entry.external)).toBe(true)
    })

    it("applique les libellés produit cible (Phase 7.2)", () => {
      const byKey = Object.fromEntries(
        CONSULTANTS_SECTIONS.map((entry) => [entry.key, entry.label]),
      )
      expect(byKey["synthese"]).toBe("Vue d’ensemble")
      expect(byKey["collaborateurs"]).toBe("Collaborateurs")
      expect(byKey["activite-conges"]).toBe("Activité & Congés")
      expect(byKey["candidats"]).toBe("Vivier Candidats")
      expect(byKey["pool-competences"]).toBe("Pool de compétences")
    })

    it("conserve « Pool de compétences » comme 5ᵉ accès Mobile (SEPARATE IMPLEMENTATION)", () => {
      expect(CONSULTANTS_SECTIONS[4].key).toBe("pool-competences")
      expect(CONSULTANTS_SECTIONS[4].href).toBe("/consultants?section=pool-competences")
    })

    it("expose un libellé de header pour chaque section", () => {
      for (const section of ALL_SECTIONS) {
        expect(HEADER_TITLE_BY_SECTION[section]).toBeTruthy()
      }
      expect(HEADER_TITLE_BY_SECTION.synthese).toBe("Vue d’ensemble")
      expect(HEADER_TITLE_BY_SECTION["activite-conges"]).toBe("Activité & Congés")
      expect(HEADER_TITLE_BY_SECTION.candidats).toBe("Vivier Candidats")
    })

    it("garde synthese comme racine canonique", () => {
      expect(CONSULTANTS_ROOT_SECTION).toBe("synthese")
    })
  })

  describe("CONSULTANTS_DESKTOP_CHAPTERS — 4 chapitres Desktop (Phase 7.2)", () => {
    it("expose exactement les 4 chapitres Desktop dans l'ordre canonique", () => {
      expect(CONSULTANTS_DESKTOP_CHAPTERS.map((entry) => entry.key)).toEqual(
        DESKTOP_CHAPTERS,
      )
      expect(CONSULTANTS_DESKTOP_CHAPTER_KEYS).toEqual(DESKTOP_CHAPTERS)
    })

    it("exclut pool-competences des chapitres Desktop", () => {
      expect(
        CONSULTANTS_DESKTOP_CHAPTERS.some((entry) => entry.key === "pool-competences"),
      ).toBe(false)
    })

    it("expose les libellés produit cible", () => {
      expect(CONSULTANTS_DESKTOP_CHAPTERS.map((entry) => entry.label)).toEqual([
        "Vue d’ensemble",
        "Collaborateurs",
        "Activité & Congés",
        "Vivier Candidats",
      ])
    })

    it("réutilise les entrées de CONSULTANTS_SECTIONS (mêmes href / clés)", () => {
      for (const chapter of CONSULTANTS_DESKTOP_CHAPTERS) {
        const source = CONSULTANTS_SECTIONS.find((entry) => entry.key === chapter.key)
        expect(source).toBeDefined()
        expect(chapter.href).toBe(source?.href)
      }
    })
  })

  describe("CONSULTANTS_CONTEXTUAL_MODULES — 3 modules Desktop", () => {
    it("liste Pool de compétences · Production & Congés · Matching Profil dans cet ordre", () => {
      expect([...CONSULTANTS_CONTEXTUAL_MODULES]).toEqual([
        "pool-competences",
        "production-conges",
        "matching-profil",
      ])
    })

    it("n'expose aucun module Mission futur", () => {
      expect(CONSULTANTS_CONTEXTUAL_MODULES).not.toContain("capacite-staffing")
      expect(
        CONSULTANTS_CONTEXTUAL_MODULES.some((key) => key.startsWith("mission")),
      ).toBe(false)
    })
  })

  describe("parseConsultantsModule", () => {
    it("résout les 3 modules et ignore les valeurs inconnues", () => {
      expect(parseConsultantsModule("pool-competences")).toBe("pool-competences")
      expect(parseConsultantsModule(["pool-competences"])).toBe("pool-competences")
      expect(parseConsultantsModule("production-conges")).toBe("production-conges")
      expect(parseConsultantsModule("matching-profil")).toBe("matching-profil")
      expect(parseConsultantsModule("matching")).toBeNull()
      expect(parseConsultantsModule("pool")).toBeNull()
      expect(parseConsultantsModule(null)).toBeNull()
      expect(parseConsultantsModule(undefined)).toBeNull()
    })
  })

  describe("buildConsultantsModuleHref", () => {
    it("construit la racine du module Pool depuis « Vue d'ensemble »", () => {
      expect(buildConsultantsModuleHref("synthese", "pool-competences")).toBe(
        "/consultants?module=pool-competences",
      )
    })

    it("préserve le chapitre support pour le module Pool", () => {
      expect(buildConsultantsModuleHref("collaborateurs", "pool-competences")).toBe(
        "/consultants?section=collaborateurs&module=pool-competences",
      )
    })

    it("préserve section + person pour les modules existants", () => {
      expect(buildConsultantsModuleHref("synthese", "production-conges")).toBe(
        "/consultants?module=production-conges",
      )
      expect(buildConsultantsModuleHref("candidats", "matching-profil", "person-123")).toBe(
        "/consultants?section=candidats&module=matching-profil&person=person-123",
      )
      expect(buildConsultantsModuleHref("synthese", null)).toBe("/consultants")
    })
  })

  describe("resolveConsultantsDesktopEntry — résolution Desktop pure (Phase 7.2)", () => {
    it("mappe les 4 chapitres Desktop tels quels", () => {
      expect(resolveConsultantsDesktopEntry(undefined, undefined)).toEqual({
        chapter: "synthese",
        module: null,
      })
      expect(resolveConsultantsDesktopEntry("collaborateurs", undefined)).toEqual({
        chapter: "collaborateurs",
        module: null,
      })
      expect(resolveConsultantsDesktopEntry("candidats", undefined)).toEqual({
        chapter: "candidats",
        module: null,
      })
    })

    it("expose le module demandé au-dessus du chapitre courant", () => {
      expect(resolveConsultantsDesktopEntry("collaborateurs", "pool-competences")).toEqual({
        chapter: "collaborateurs",
        module: "pool-competences",
      })
      expect(resolveConsultantsDesktopEntry(undefined, "matching-profil")).toEqual({
        chapter: "synthese",
        module: "matching-profil",
      })
    })

    it("compat : ?section=pool-competences → chapitre support synthese + module pool", () => {
      expect(resolveConsultantsDesktopEntry("pool-competences", undefined)).toEqual({
        chapter: "synthese",
        module: "pool-competences",
      })
    })

    it("compat : ?section=pool-competences ne rend jamais un 5ᵉ chapitre Desktop", () => {
      const { chapter } = resolveConsultantsDesktopEntry("pool-competences", undefined)
      expect(chapter).not.toBe("pool-competences")
      expect(CONSULTANTS_DESKTOP_CHAPTER_KEYS).toContain(chapter)
    })

    it("compat : un module explicite l'emporte sur le fallback pool", () => {
      expect(
        resolveConsultantsDesktopEntry("pool-competences", "production-conges"),
      ).toEqual({ chapter: "synthese", module: "production-conges" })
    })
  })
})

describe("ConsultantsDesktopShell — conformité SHELL-0018 (Phase 7.2)", () => {
  function render(
    active: ConsultantsDesktopChapter,
    activeModule?: "pool-competences" | "production-conges" | "matching-profil" | null,
  ) {
    return renderToStaticMarkup(
      React.createElement(
        ConsultantsDesktopShell,
        { activeSection: active, activeModule: activeModule ?? null },
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

  it("affiche dans le header le libellé produit cible du chapitre actif", () => {
    expect(render("synthese")).toContain("Vue d’ensemble")
    expect(render("collaborateurs")).toContain("Collaborateurs")
    expect(render("activite-conges")).toContain("Activité &amp; Congés")
    expect(render("candidats")).toContain("Vivier Candidats")
  })

  it("rend exactement les 4 chapitres Desktop avec leurs href ?section=", () => {
    const markup = render("collaborateurs")
    expect(markup).toContain('href="/consultants?section=collaborateurs"')
    expect(markup).toContain('href="/consultants?section=activite-conges"')
    expect(markup).toContain('href="/consultants?section=candidats"')
    expect(markup).not.toContain('href="/recruitment"')
  })

  it("ne rend PAS « Pool de compétences » comme chapitre (?section=pool-competences absent des chapitres)", () => {
    const markup = render("synthese")
    // Le seul lien pool-competences autorisé est celui du MODULE.
    expect(markup).not.toContain('href="/consultants?section=pool-competences"')
  })

  it("marque le chapitre actif avec aria-current=page", () => {
    const markup = render("collaborateurs")
    expect(markup).toContain('aria-current="page"')
  })

  it("rend la section Modules avec Pool de compétences, Production & Congés et Matching Profil", () => {
    const markup = render("synthese")
    expect(markup).toContain("Modules")
    expect(markup).toContain("Pool de compétences")
    expect(markup).toContain('href="/consultants?module=pool-competences"')
    expect(markup).toContain("Production &amp; Congés")
    expect(markup).toContain('href="/consultants?module=production-conges"')
    expect(markup).toContain("Matching Profil")
    expect(markup).toContain('href="/consultants?module=matching-profil"')
  })

  it("génère l'URL correcte des modules pour les chapitres avec query param", () => {
    const markup = render("collaborateurs")
    expect(markup).toContain(
      'href="/consultants?section=collaborateurs&amp;module=pool-competences"',
    )
    expect(markup).toContain(
      'href="/consultants?section=collaborateurs&amp;module=production-conges"',
    )
    expect(markup).toContain(
      'href="/consultants?section=collaborateurs&amp;module=matching-profil"',
    )
  })

  it("marque le module Pool actif dans le rail quand activeModule=pool-competences", () => {
    // Sans poolSkillsData l'overlay ne s'ouvre pas, mais le rail signale l'état :
    // le chapitre support (synthese) ET le module Pool portent aria-current=page.
    const markup = render("synthese", "pool-competences")
    const marks = markup.match(/aria-current="page"/g) ?? []
    expect(marks.length).toBeGreaterThanOrEqual(2)
    expect(markup).toContain('href="/consultants?module=pool-competences"')
  })
})

describe("Consultants Workspace — invariants de code (SHELL 6.2 / Phase 7.2)", () => {
  const pageSource = readFileSync(
    resolve(root, "src/app/(app)/consultants/page.tsx"),
    "utf8",
  )
  const layoutSource = readFileSync(
    resolve(root, "src/app/(app)/consultants/layout.tsx"),
    "utf8",
  )
  const desktopShellSource = readFileSync(
    resolve(root, "src/features/consultants/desktop/ConsultantsDesktopShell.tsx"),
    "utf8",
  )
  const activiteCongesPath = resolve(
    root,
    "src/app/(app)/consultants/activite-conges/page.tsx",
  )
  const poolCompetencesPath = resolve(
    root,
    "src/app/(app)/consultants/pool-competences/page.tsx",
  )
  const tabbedDir = resolve(root, "src/app/(app)/consultants/(tabbed)")

  it("la page résout la section depuis l'URL, pas depuis un useState", () => {
    expect(pageSource).toContain("parseConsultantsSection")
    expect(pageSource).toContain("resolveConsultantsDesktopEntry")
    expect(pageSource).not.toContain("useState")
  })

  it("aucun layout Consultants n'utilise SectionNavBarSlot", () => {
    expect(layoutSource).not.toContain("SectionNavBarSlot")
  })

  it("le dossier (tabbed) est définitivement supprimé", () => {
    expect(existsSync(tabbedDir)).toBe(false)
  })

  it("les deux routes legacy existent toujours hors (tabbed) et redirigent canoniquement (aucun nouveau redirect)", () => {
    expect(existsSync(activiteCongesPath)).toBe(true)
    expect(existsSync(poolCompetencesPath)).toBe(true)

    const activiteCongesContent = readFileSync(activiteCongesPath, "utf8")
    const poolCompetencesContent = readFileSync(poolCompetencesPath, "utf8")

    expect(activiteCongesContent).toContain(
      'permanentRedirect("/consultants?section=activite-conges")',
    )
    expect(poolCompetencesContent).toContain(
      'permanentRedirect("/consultants?section=pool-competences")',
    )
  })

  it("ConsultantsDesktopShell n'importe ni n'utilise useSidebarCollapse", () => {
    expect(desktopShellSource).not.toContain("useSidebarCollapse")
    expect(desktopShellSource).not.toContain("requestCollapse")
    expect(desktopShellSource).not.toContain("requestRestore")
  })
})

describe("Pool de compétences — Adaptive Design (Phase 7.2)", () => {
  const pageSource = readFileSync(
    resolve(root, "src/app/(app)/consultants/page.tsx"),
    "utf8",
  )
  const desktopShellSource = readFileSync(
    resolve(root, "src/features/consultants/desktop/ConsultantsDesktopShell.tsx"),
    "utf8",
  )
  const poolDesktopPath = resolve(
    root,
    "src/features/consultants/modules/pool-competences/desktop/PoolCompetencesDesktop.tsx",
  )

  it("le wrapper Desktop du Pool existe et réutilise PoolCompetencesMap sans le réécrire", () => {
    expect(existsSync(poolDesktopPath)).toBe(true)
    const src = readFileSync(poolDesktopPath, "utf8")
    expect(src).toContain("PoolCompetencesMap")
    expect(src).toContain("AppDialog")
    // Aucune logique métier dupliquée dans le wrapper.
    expect(src).not.toContain("buildPoolCompetencesDataset")
    expect(src).not.toContain("getConsultantsSkills(")
  })

  it("PoolCompetencesDesktop n'est monté que dans la branche Desktop (ConsultantsDesktopShell)", () => {
    expect(desktopShellSource).toContain("PoolCompetencesDesktop")
    // La page ne l'importe jamais directement : elle passe par le shell Desktop.
    expect(pageSource).not.toContain("PoolCompetencesDesktop")
  })

  it("le Mobile rend PoolCompetencesMap directement via l'accès historique", () => {
    expect(pageSource).toContain('isMobile && activeSection === "pool-competences"')
    expect(pageSource).toContain("<PoolCompetencesMap")
  })

  it("aucune bascule CSS (hidden md:block / md:hidden) pour charger les deux implémentations", () => {
    expect(pageSource).not.toMatch(/hidden\s+md:block/)
    expect(pageSource).not.toMatch(/md:hidden/)
    expect(desktopShellSource).not.toMatch(/hidden\s+md:block/)
    expect(desktopShellSource).not.toMatch(/md:hidden/)
  })

  it("le Pool Desktop n'est lazy-loadé que si le module est demandé (ADR-0006)", () => {
    expect(pageSource).toContain('!isMobile && activeModule === "pool-competences"')
    expect(pageSource).toContain("await getConsultantsSkills()")
  })
})
