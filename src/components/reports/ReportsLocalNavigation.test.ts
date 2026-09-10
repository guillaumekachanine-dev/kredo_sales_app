import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  buildReportsRailProps,
  buildReportsSectionHref,
  getReportsDesktopChapterLabel,
  parseReportsSection,
  REPORTS_DESKTOP_CHAPTERS,
  ReportsLocalNavigation,
  type ReportsContextualModule,
  type ReportsSection,
} from "./ReportsLocalNavigation"

const root = process.cwd()

function renderNavigation(options?: {
  active?: ReportsSection
  activeModule?: ReportsContextualModule | null
  onOpenKnowledgeManagement?: () => void
  onOpenTransverseAnalysis?: () => void
}) {
  return renderToStaticMarkup(
    React.createElement(ReportsLocalNavigation, {
      active: options?.active ?? "documents",
      onChange: () => {},
      activeModule: options?.activeModule,
      onOpenKnowledgeManagement: options?.onOpenKnowledgeManagement,
      onOpenTransverseAnalysis: options?.onOpenTransverseAnalysis,
    }),
  )
}

describe("ReportsLocalNavigation & URLisation", () => {
  const desktopSource = readFileSync(
    resolve(root, "src/components/reports/ReportsDesktopView.tsx"),
    "utf8",
  )
  const mobileSource = readFileSync(
    resolve(root, "src/components/reports/ReportsMobileView.tsx"),
    "utf8",
  )
  const navigationSource = readFileSync(
    resolve(root, "src/components/reports/ReportsLocalNavigation.tsx"),
    "utf8",
  )

  describe("parseReportsSection", () => {
    it("résout null et undefined vers documents", () => {
      expect(parseReportsSection(null)).toBe("documents")
      expect(parseReportsSection(undefined)).toBe("documents")
    })

    it("résout les valeurs valides de section", () => {
      expect(parseReportsSection("documents")).toBe("documents")
      expect(parseReportsSection("knowledge")).toBe("knowledge")
      expect(parseReportsSection("generation")).toBe("generation")
    })

    it("résout une valeur invalide vers documents", () => {
      expect(parseReportsSection("invalide")).toBe("documents")
      expect(parseReportsSection("")).toBe("documents")
      expect(parseReportsSection("123")).toBe("documents")
    })
  })

  describe("buildReportsSectionHref", () => {
    it("supprime le paramètre section pour le chapitre racine documents", () => {
      const searchParams = new URLSearchParams("section=knowledge&documentType=financial")
      const href = buildReportsSectionHref("/reports", searchParams, "documents")
      expect(href).toBe("/reports?documentType=financial")
    })

    it("ajoute section=knowledge pour le chapitre Connaissance", () => {
      const searchParams = new URLSearchParams("documentType=financial&page=2")
      const href = buildReportsSectionHref("/reports", searchParams, "knowledge")
      expect(href).toBe("/reports?documentType=financial&page=2&section=knowledge")
    })

    it("ajoute section=generation pour le chapitre Génération", () => {
      const searchParams = new URLSearchParams("doc=abc")
      const href = buildReportsSectionHref("/reports", searchParams, "generation")
      expect(href).toBe("/reports?doc=abc&section=generation")
    })

    it("préserve l'intégralité des query params métiers existants lors des transitions", () => {
      const searchParams = new URLSearchParams("documentType=financial&page=2&doc=abc&search=test")
      const hrefKnowledge = buildReportsSectionHref("/reports", searchParams, "knowledge")
      expect(hrefKnowledge).toBe("/reports?documentType=financial&page=2&doc=abc&search=test&section=knowledge")

      const searchParamsWithKnowledge = new URLSearchParams(hrefKnowledge.split("?")[1])
      const hrefDocuments = buildReportsSectionHref("/reports", searchParamsWithKnowledge, "documents")
      expect(hrefDocuments).toBe("/reports?documentType=financial&page=2&doc=abc&search=test")
    })
  })

  describe("Structure et invariants Desktop", () => {
    it("utilise le SectionRail canonique avec le chapeau Rapports & rédaction", () => {
      const html = renderNavigation()

      expect(navigationSource).toContain("<SectionRail")
      expect(html).toContain('aria-label="Navigation locale Rapports &amp; rédaction"')
      expect(html).toContain("w-[11.5rem]")
      expect(html).toContain("bg-edito-navy")
      expect(html).toContain("Rapports &amp; rédaction")
      expect(html).toContain(">Chapitres<")
    })

    it("préserve les trois identifiants, libellés et leur ordre exact", () => {
      expect(REPORTS_DESKTOP_CHAPTERS.map(({ key, label }) => ({ key, label }))).toEqual([
        { key: "documents", label: "Bibliothèque" },
        { key: "knowledge", label: "Connaissance" },
        { key: "generation", label: "Génération" },
      ])

      const model = buildReportsRailProps({ active: "documents", onChange: () => {} })
      expect(model.chapters.map(({ key, label }) => ({ key, label }))).toEqual([
        { key: "documents", label: "Bibliothèque" },
        { key: "knowledge", label: "Connaissance" },
        { key: "generation", label: "Génération" },
      ])
      expect(model.chapters.every((chapter) => chapter.icon)).toBe(true)
    })

    it("mappe ReportsSection vers l'unique chapitre actif", () => {
      const model = buildReportsRailProps({
        active: "knowledge",
        onChange: () => {},
      })

      expect(model.chapters.filter((chapter) => chapter.active).map((chapter) => chapter.key)).toEqual([
        "knowledge",
      ])

      const html = renderNavigation({ active: "knowledge" })
      expect(html).toMatch(
        /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Connaissance<\/span>/,
      )
    })

    it("ramène le chapeau à la section racine documents sans modifier d'autre état", () => {
      const onChange = vi.fn()
      const model = buildReportsRailProps({ active: "generation", onChange })

      model.home.onSelect?.()

      expect(onChange).toHaveBeenCalledOnce()
      expect(onChange).toHaveBeenCalledWith("documents")
    })

    it("dérive le titre principal exact depuis la configuration des chapitres", () => {
      expect(
        REPORTS_DESKTOP_CHAPTERS.map((chapter) => getReportsDesktopChapterLabel(chapter.key)),
      ).toEqual(["Bibliothèque", "Connaissance", "Génération"])

      expect(getReportsDesktopChapterLabel("documents")).toBe("Bibliothèque")
      expect(getReportsDesktopChapterLabel("knowledge")).toBe("Connaissance")
      expect(getReportsDesktopChapterLabel("generation")).toBe("Génération")

      expect(desktopSource).toContain("const activeChapterTitle = getReportsDesktopChapterLabel(activeSection)")
      expect(desktopSource).toContain("{activeChapterTitle}")
    })

    it("omet la section Modules et ne contient aucun bouton mort par défaut", () => {
      const model = buildReportsRailProps({ active: "documents", onChange: () => {} })
      const html = renderNavigation()

      expect(model.contextualModules).toBeUndefined()
      expect(html).not.toContain(">Modules<")
      expect(html).not.toContain("CRM Launcher")
      expect(navigationSource).not.toContain("CRM Launcher")
      expect(navigationSource).not.toContain("useCrmAccountLauncherStore")
      expect(desktopSource).not.toContain("useCrmAccountLauncherStore")
    })

    it("expose les deux modules contextuels dans l'ordre exact quand les callbacks sont fournis", () => {
      const onOpenKnowledgeManagement = vi.fn()
      const onOpenTransverseAnalysis = vi.fn()
      const model = buildReportsRailProps({
        active: "documents",
        onChange: () => {},
        onOpenKnowledgeManagement,
        onOpenTransverseAnalysis,
      })

      expect(model.contextualModules).toHaveLength(2)
      expect(model.contextualModules?.map(({ key, label }) => ({ key, label }))).toEqual([
        { key: "knowledge-management", label: "Gestion de la connaissance" },
        { key: "transverse-analysis", label: "Analyse transverse" },
      ])
      expect(model.contextualModules?.every((m) => Boolean(m.icon))).toBe(true)

      model.contextualModules?.[0]?.onSelect?.()
      expect(onOpenKnowledgeManagement).toHaveBeenCalledOnce()

      model.contextualModules?.[1]?.onSelect?.()
      expect(onOpenTransverseAnalysis).toHaveBeenCalledOnce()

      const html = renderNavigation({
        onOpenKnowledgeManagement,
        onOpenTransverseAnalysis,
      })
      expect(html).toContain(">Modules<")
      expect(html).toContain("Gestion de la connaissance")
      expect(html).toContain("Analyse transverse")
    })

    it("reflète l'état actif de chaque module contextuel", () => {
      const onOpenKnowledgeManagement = vi.fn()
      const onOpenTransverseAnalysis = vi.fn()

      const modelKMActive = buildReportsRailProps({
        active: "documents",
        onChange: () => {},
        activeModule: "knowledge-management",
        onOpenKnowledgeManagement,
        onOpenTransverseAnalysis,
      })
      expect(modelKMActive.contextualModules?.find((m) => m.key === "knowledge-management")?.active).toBe(true)
      expect(modelKMActive.contextualModules?.find((m) => m.key === "transverse-analysis")?.active).toBe(false)

      const modelTAActive = buildReportsRailProps({
        active: "documents",
        onChange: () => {},
        activeModule: "transverse-analysis",
        onOpenKnowledgeManagement,
        onOpenTransverseAnalysis,
      })
      expect(modelTAActive.contextualModules?.find((m) => m.key === "knowledge-management")?.active).toBe(false)
      expect(modelTAActive.contextualModules?.find((m) => m.key === "transverse-analysis")?.active).toBe(true)

      const modelNoneActive = buildReportsRailProps({
        active: "documents",
        onChange: () => {},
        activeModule: null,
        onOpenKnowledgeManagement,
        onOpenTransverseAnalysis,
      })
      expect(modelNoneActive.contextualModules?.every((m) => !m.active)).toBe(true)
    })

    it("n'expose que le module dont le callback est fourni (zero-dead-button)", () => {
      const modelKMOnly = buildReportsRailProps({
        active: "documents",
        onChange: () => {},
        onOpenKnowledgeManagement: vi.fn(),
      })
      expect(modelKMOnly.contextualModules?.map((m) => m.key)).toEqual(["knowledge-management"])

      const modelTAOnly = buildReportsRailProps({
        active: "documents",
        onChange: () => {},
        onOpenTransverseAnalysis: vi.fn(),
      })
      expect(modelTAOnly.contextualModules?.map((m) => m.key)).toEqual(["transverse-analysis"])
    })

    it("connecte les modules et gère leur état actif dans ReportsDesktopView", () => {
      expect(desktopSource).toContain("onOpenKnowledgeManagement={handleOpenKnowledgeManagement}")
      expect(desktopSource).toContain("onOpenTransverseAnalysis={handleOpenTransverseAnalysis}")
      expect(desktopSource).toContain("activeModule={activeModule}")
      expect(desktopSource).not.toContain("Générer une analyse")
    })

    it("écoute WATCH_ANALYSIS_COMPOSER_EVENT sur Desktop et Mobile pour Cockpit Intelligence", () => {
      expect(desktopSource).toContain("WATCH_ANALYSIS_COMPOSER_EVENT")
      expect(desktopSource).toContain("window.addEventListener(WATCH_ANALYSIS_COMPOSER_EVENT")
      expect(mobileSource).toContain("WATCH_ANALYSIS_COMPOSER_EVENT")
      expect(mobileSource).toContain("window.addEventListener(WATCH_ANALYSIS_COMPOSER_EVENT")
    })

    it("ne contient aucun useState<ReportsSection> dans ReportsDesktopView", () => {
      expect(desktopSource).not.toContain("useState<ReportsSection>")
      expect(desktopSource).toContain("parseReportsSection(searchParams.get(\"section\"))")
    })

    it("utilise router.push pour la navigation de chapitre et router.replace pour les mutations de filtres", () => {
      expect(desktopSource).toContain("router.push(")
      expect(desktopSource).toContain("buildReportsSectionHref(pathname, searchParams, nextSection)")
      expect(desktopSource).toContain("router.replace(")
    })

    it("ne supprime pas le paramètre section dans handleReset", () => {
      expect(desktopSource).toContain('const handleReset = () => {')
      const resetBlock = desktopSource.slice(
        desktopSource.indexOf("const handleReset"),
        desktopSource.indexOf("handleSelectDocument"),
      )
      expect(resetBlock).not.toContain('"section"')
    })

    it("conserve la vue Mobile intacte avec son propre état local et le libellé Connaissances", () => {
      expect(mobileSource).toContain('useState<ReportsSection>("documents")')
      expect(mobileSource).toContain('{ id: "knowledge", label: "Connaissances" }')
      expect(mobileSource).not.toContain("parseReportsSection")
    })
  })
})
