import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  buildOpportunitiesSectionHref,
  HEADER_TITLE_BY_SECTION,
  OPPORTUNITIES_CANONICAL_PATH,
  OPPORTUNITIES_ROOT_SECTION,
  OPPORTUNITIES_SECTION_KEYS,
  OPPORTUNITIES_SECTIONS,
  parseOpportunitiesSection,
  searchParamsToString,
  type OpportunitiesSection,
} from "./opportunities-sections"
import { OpportunitiesDesktopShell } from "../desktop/OpportunitiesDesktopShell"

const root = process.cwd()

const ALL_SECTIONS: OpportunitiesSection[] = [
  "synthese",
  "besoins",
  "avant-vente",
  "planning",
]

const sp = (query: string) => new URLSearchParams(query)

describe("opportunities-sections — contrat de navigation", () => {
  describe("parseOpportunitiesSection", () => {
    it("résout absent / null / undefined / vide vers l'état racine synthese", () => {
      expect(parseOpportunitiesSection({})).toBe("synthese")
      expect(parseOpportunitiesSection({ section: undefined })).toBe("synthese")
      expect(parseOpportunitiesSection(sp(""))).toBe("synthese")
      expect(parseOpportunitiesSection({ section: "" })).toBe("synthese")
      expect(parseOpportunitiesSection({ section: "   " })).toBe("synthese")
    })

    it("résout les 4 chapitres connus (synthese explicite inclus)", () => {
      expect(parseOpportunitiesSection({ section: "synthese" })).toBe("synthese")
      expect(parseOpportunitiesSection({ section: "besoins" })).toBe("besoins")
      expect(parseOpportunitiesSection({ section: "avant-vente" })).toBe("avant-vente")
      expect(parseOpportunitiesSection({ section: "planning" })).toBe("planning")
      expect(parseOpportunitiesSection(sp("section=planning"))).toBe("planning")
    })

    it("prend la première valeur d'un paramètre répété", () => {
      expect(parseOpportunitiesSection({ section: ["besoins", "planning"] })).toBe("besoins")
    })

    it("résout une valeur de section inconnue vers synthese", () => {
      expect(parseOpportunitiesSection({ section: "inconnu" })).toBe("synthese")
      expect(parseOpportunitiesSection({ section: "staffing" })).toBe("synthese")
    })

    it("compat legacy : ?scope=needs et ?scope=staffing (sans section) → besoins", () => {
      expect(parseOpportunitiesSection({ scope: "needs" })).toBe("besoins")
      expect(parseOpportunitiesSection({ scope: "staffing" })).toBe("besoins")
      expect(parseOpportunitiesSection(sp("scope=needs"))).toBe("besoins")
      expect(parseOpportunitiesSection(sp("scope=staffing&view=planning"))).toBe("besoins")
    })

    it("un scope inconnu ne déclenche pas la compat", () => {
      expect(parseOpportunitiesSection({ scope: "autre" })).toBe("synthese")
    })

    it("un section explicite l'emporte toujours sur scope", () => {
      expect(parseOpportunitiesSection({ section: "planning", scope: "needs" })).toBe("planning")
      expect(parseOpportunitiesSection({ section: "inconnu", scope: "needs" })).toBe("synthese")
    })
  })

  describe("buildOpportunitiesSectionHref", () => {
    it("omet le paramètre section pour l'état racine synthese", () => {
      expect(
        buildOpportunitiesSectionHref(OPPORTUNITIES_CANONICAL_PATH, sp(""), "synthese"),
      ).toBe("/missions/opps")
    })

    it("pose ?section= pour les autres chapitres", () => {
      expect(
        buildOpportunitiesSectionHref(OPPORTUNITIES_CANONICAL_PATH, sp(""), "besoins"),
      ).toBe("/missions/opps?section=besoins")
      expect(
        buildOpportunitiesSectionHref(OPPORTUNITIES_CANONICAL_PATH, sp(""), "avant-vente"),
      ).toBe("/missions/opps?section=avant-vente")
      expect(
        buildOpportunitiesSectionHref(OPPORTUNITIES_CANONICAL_PATH, sp(""), "planning"),
      ).toBe("/missions/opps?section=planning")
    })

    it("préserve les query params tiers", () => {
      expect(
        buildOpportunitiesSectionHref(
          OPPORTUNITIES_CANONICAL_PATH,
          sp("theme=dark&debug=1"),
          "planning",
        ),
      ).toBe("/missions/opps?theme=dark&debug=1&section=planning")
      expect(
        buildOpportunitiesSectionHref(
          OPPORTUNITIES_CANONICAL_PATH,
          sp("theme=dark&section=planning"),
          "synthese",
        ),
      ).toBe("/missions/opps?theme=dark")
    })

    it("retire les params d'état de chapitre (scope/view/stage/priority/practice/sort/direction/opp/module) au changement de chapitre", () => {
      expect(
        buildOpportunitiesSectionHref(
          OPPORTUNITIES_CANONICAL_PATH,
          sp("scope=staffing&view=planning&stage=gagne&priority=haute&practice=Data&sort=acv&direction=desc&opp=need-1&module=matching&keep=1"),
          "planning",
        ),
      ).toBe("/missions/opps?keep=1&section=planning")
    })

    it("le lien vers besoins depuis une URL legacy scope produit l'href canonique", () => {
      expect(
        buildOpportunitiesSectionHref(OPPORTUNITIES_CANONICAL_PATH, sp("scope=needs"), "besoins"),
      ).toBe("/missions/opps?section=besoins")
    })
  })

  describe("searchParamsToString", () => {
    it("aplati un searchParams de Server Component", () => {
      expect(searchParamsToString({ section: "planning", debug: "1" })).toBe(
        "section=planning&debug=1",
      )
      expect(searchParamsToString({ tag: ["a", "b"], skip: undefined })).toBe("tag=a&tag=b")
      expect(searchParamsToString({})).toBe("")
    })
  })

  describe("OPPORTUNITIES_SECTIONS", () => {
    it("liste les 4 chapitres dans l'ordre canonique avec les labels cibles", () => {
      expect(OPPORTUNITIES_SECTIONS.map(({ key, label }) => ({ key, label }))).toEqual([
        { key: "synthese", label: "Vue d'ensemble" },
        { key: "besoins", label: "Besoins & Staffing" },
        { key: "avant-vente", label: "Avant-vente Projets" },
        { key: "planning", label: "Planning & Échéances" },
      ])
      expect([...OPPORTUNITIES_SECTION_KEYS]).toEqual(ALL_SECTIONS)
    })

    it("expose un libellé de header cohérent avec le rail pour chaque chapitre", () => {
      for (const entry of OPPORTUNITIES_SECTIONS) {
        expect(HEADER_TITLE_BY_SECTION[entry.key]).toBe(entry.label)
      }
    })

    it("garde synthese comme racine canonique", () => {
      expect(OPPORTUNITIES_ROOT_SECTION).toBe("synthese")
    })
  })
})

describe("OpportunitiesDesktopShell — conformité SHELL-0018 V2", () => {
  function render(active: OpportunitiesSection, searchParamsString = "") {
    return renderToStaticMarkup(
      React.createElement(
        OpportunitiesDesktopShell,
        { activeSection: active, searchParamsString },
        React.createElement("div", null, "contenu"),
      ),
    )
  }

  it("rend le chapeau navy 184px avec le titre de page « Opportunités » → racine", () => {
    const markup = render("synthese")
    expect(markup).toContain("Opportunités")
    expect(markup).toContain('href="/missions/opps"')
    expect(markup).toContain("w-[11.5rem]")
    expect(markup).toContain("bg-edito-navy")
    expect(markup).toContain('aria-label="Navigation Opportunités"')
  })

  it("affiche dans le header le libellé exact du chapitre actif", () => {
    expect(render("synthese")).toContain("Vue d&#x27;ensemble")
    expect(render("besoins")).toContain("Besoins &amp; Staffing")
    expect(render("avant-vente")).toContain("Avant-vente Projets")
    expect(render("planning")).toContain("Planning &amp; Échéances")
  })

  it("rend les 4 chapitres avec leurs href ?section= (racine sans paramètre)", () => {
    const markup = render("besoins")
    expect(markup).toContain('href="/missions/opps?section=besoins"')
    expect(markup).toContain('href="/missions/opps?section=avant-vente"')
    expect(markup).toContain('href="/missions/opps?section=planning"')
    // Le chapitre racine « Vue d'ensemble » pointe vers /missions/opps sans ?section=
    expect(markup).toContain('href="/missions/opps"')
  })

  it("préserve les query params tiers dans les href de chapitre", () => {
    const markup = render("synthese", "debug=1")
    expect(markup).toContain('href="/missions/opps?debug=1&amp;section=besoins"')
  })

  it("marque le chapitre actif avec aria-current=page", () => {
    expect(render("besoins")).toContain('aria-current="page"')
    expect(render("besoins")).toContain("border-l-edito-brass")
  })

  it("rend la section Modules (Lot 10) — les 3 modules sur TOUS les chapitres", () => {
    for (const section of ["synthese", "besoins", "avant-vente", "planning"] as const) {
      const markup = render(section)
      expect(markup).toContain(">Modules<")
      expect(markup).toContain("Matching profils")
      expect(markup).toContain("Simulation financière")
      expect(markup).toContain("Revue post-mortem")
    }
  })

  it("les href de module préservent la query courante (section + opp + tiers)", () => {
    const markup = render("besoins", "section=besoins&opp=need-1&debug=1")
    expect(markup).toContain(
      'href="/missions/opps?section=besoins&amp;opp=need-1&amp;debug=1&amp;module=matching"',
    )
  })

  it("marque le module actif avec aria-current=page", () => {
    const markup = render("synthese", "module=post-mortem")
    expect(markup).toContain('aria-current="page"')
    expect(markup).toContain("Revue post-mortem")
  })
})

describe("Opportunities Workspace — invariants de code", () => {
  const pageSource = readFileSync(
    resolve(root, "src/app/(app)/missions/opps/page.tsx"),
    "utf8",
  )

  it("l'orchestrateur résout la section depuis l'URL, pas depuis un useState", () => {
    expect(pageSource).toContain("parseOpportunitiesSection")
    expect(pageSource).not.toContain("useState")
  })

  it("l'orchestrateur distribue Desktop/Mobile via getDashboardDevice()", () => {
    expect(pageSource).toContain("getDashboardDevice")
    expect(pageSource).toContain('device === "mobile"')
  })

  it("NeedsStaffingWorkspace est définitivement absent du code applicatif (Lot 12)", () => {
    expect(pageSource).not.toContain("NeedsStaffingWorkspace")
    expect(
      existsSync(
        resolve(root, "src/components/needs-staffing/NeedsStaffingWorkspace.tsx"),
      ),
    ).toBe(false)
  })

  it("l'orchestrateur monte les 4 chapitres Desktop cibles et le host des modules", () => {
    expect(pageSource).toContain("SummaryDesktop")
    expect(pageSource).toContain("NeedsDesktop")
    expect(pageSource).toContain("PresalesDesktop")
    expect(pageSource).toContain("PlanningDesktop")
    expect(pageSource).toContain("OpportunitiesModulesHost")
  })

  it("la branche mobile ne monte aucun composant Desktop et rend un EmptyState minimal", () => {
    expect(pageSource).toContain("EmptyState")
    const mobileBranch = pageSource.split('device === "mobile"')[1]?.split("return (")[1]?.split("</main>")[0]
    expect(mobileBranch).toContain("<EmptyState")
    expect(mobileBranch).not.toContain("OpportunitiesDesktopShell")
  })

  it("ne réintroduit pas la redirection serveur obligatoire sur ?scope=", () => {
    expect(pageSource).not.toContain("redirect(")
  })

  it("la route vit hors du groupe (tabbed)", () => {
    expect(existsSync(resolve(root, "src/app/(app)/missions/(tabbed)/opps/page.tsx"))).toBe(false)
  })

  it("OpportunitiesDesktopShell n'importe ni n'utilise useSidebarCollapse (SHELL 6.3 / Lot 11)", () => {
    const desktopShellSource = readFileSync(
      resolve(root, "src/features/opportunities/desktop/OpportunitiesDesktopShell.tsx"),
      "utf8",
    )
    expect(desktopShellSource).not.toContain("useSidebarCollapse")
    expect(desktopShellSource).not.toContain("requestCollapse")
    expect(desktopShellSource).not.toContain("requestRestore")
  })
})

describe("Opportunities Workspace — suppression définitive du legacy (Lot 12)", () => {
  const deadPaths = [
    "src/components/needs-staffing/NeedsStaffingWorkspace.tsx",
    "src/components/needs-staffing/NeedsListView.tsx",
    "src/components/needs-staffing/StaffingListWorkspaceView.tsx",
    "src/components/needs-staffing/UnifiedPlanningView.tsx",
    "src/lib/needs-staffing/use-needs-staffing-url-state.ts",
    "src/components/missions/OpportunitiesDesktopView.tsx",
    "src/components/missions/OpportunitiesKpiSection.tsx",
    "src/components/missions/OpportunitySkillsCloud.tsx",
    "src/components/missions/planning/OpportunitiesPlanningView.tsx",
    "src/app/(app)/missions/_data/get-opportunities-planning.ts",
    "src/app/(app)/missions/_data/get-opportunity-skills-cloud.ts",
    "src/components/staffing/StaffingDesktopDashboard.tsx",
    "src/components/staffing/StaffingMobileDashboard.tsx",
    "src/components/staffing/StaffingDesktopView.tsx",
    "src/components/staffing/StaffingMobileView.tsx",
    "src/components/staffing/StaffingListView.tsx",
    "src/components/staffing/StaffingPlanningView.tsx",
    "src/components/staffing/StaffingTabbedShell.tsx",
    "src/components/staffing/StaffingSectionTabBar.tsx",
    "src/components/staffing/StaffingEntityPanel.tsx",
    "src/components/staffing/StaffingDrawer.tsx",
    "src/components/staffing/index.tsx",
    "src/app/(app)/staffing/_data/get-staffings-planning.ts",
  ]

  it.each(deadPaths)("le fichier legacy %s est supprimé", (relPath) => {
    expect(existsSync(resolve(root, relPath))).toBe(false)
  })

  it("les briques protégées sont toujours présentes", () => {
    const protectedPaths = [
      "src/components/needs-staffing/StageQuickEditorDialog.tsx",
      "src/components/needs-staffing/StageTimeline.tsx",
      "src/components/needs-staffing/stage-timeline-config.ts",
      "src/components/needs-staffing/NewStaffingButton.tsx",
      "src/lib/needs-staffing/model.ts",
      "src/lib/needs-staffing/coverage.ts",
      "src/lib/needs-staffing/url-state.ts",
      "src/components/staffing/AssistanceCaseDrawer.tsx",
      "src/components/staffing/matching/MatchingDialog.tsx",
      "src/app/(app)/missions/_data/get-needs-staffing-shared.ts",
      "src/app/(app)/missions/_data/get-opportunities-list.ts",
      "src/app/(app)/missions/_data/get-opportunity-detail.ts",
      "src/app/(app)/staffing/_data/get-staffings-list.ts",
    ]

    for (const relPath of protectedPaths) {
      expect(existsSync(resolve(root, relPath))).toBe(true)
    }
  })
})

describe("Engagements & Missions — invariants legacy (SHELL 6.3)", () => {
  const tabbedDir = resolve(root, "src/app/(app)/missions/(tabbed)")
  const activesPath = resolve(root, "src/app/(app)/missions/actives/page.tsx")
  const projetsPath = resolve(root, "src/app/(app)/missions/projets/page.tsx")
  const tabbedShellPath = resolve(root, "src/components/missions/MissionsTabbedShell.tsx")

  it("le dossier missions/(tabbed) est définitivement supprimé", () => {
    expect(existsSync(tabbedDir)).toBe(false)
  })

  it("MissionsTabbedShell est définitivement supprimé", () => {
    expect(existsSync(tabbedShellPath)).toBe(false)
  })

  it("les routes /missions/actives et /missions/projets redirigent de façon permanente vers ?vue=", () => {
    expect(existsSync(activesPath)).toBe(true)
    expect(existsSync(projetsPath)).toBe(true)

    const activesSource = readFileSync(activesPath, "utf8")
    const projetsSource = readFileSync(projetsPath, "utf8")

    expect(activesSource).toContain('permanentRedirect("/missions?vue=missions-at")')
    expect(projetsSource).toContain('permanentRedirect("/missions?vue=projets")')
  })
})
