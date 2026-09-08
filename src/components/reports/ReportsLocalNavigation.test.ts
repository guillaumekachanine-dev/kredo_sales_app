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
  type ReportsSection,
} from "./ReportsLocalNavigation"

const root = process.cwd()

function renderNavigation(options?: {
  active?: ReportsSection
  onOpenKnowledgeManagement?: () => void
}) {
  return renderToStaticMarkup(
    React.createElement(ReportsLocalNavigation, {
      active: options?.active ?? "documents",
      onChange: () => {},
      onOpenKnowledgeManagement: options?.onOpenKnowledgeManagement,
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

    it("ajoute section=knowledge pour le chapitre Connaissances", () => {
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
        { key: "knowledge", label: "Connaissances" },
        { key: "generation", label: "Génération" },
      ])

      const model = buildReportsRailProps({ active: "documents", onChange: () => {} })
      expect(model.chapters.map(({ key, label }) => ({ key, label }))).toEqual([
        { key: "documents", label: "Bibliothèque" },
        { key: "knowledge", label: "Connaissances" },
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
        /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Connaissances<\/span>/,
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
      ).toEqual(["Bibliothèque", "Connaissances", "Génération"])

      expect(getReportsDesktopChapterLabel("documents")).toBe("Bibliothèque")
      expect(getReportsDesktopChapterLabel("knowledge")).toBe("Connaissances")
      expect(getReportsDesktopChapterLabel("generation")).toBe("Génération")

      expect(desktopSource).toContain("const activeChapterTitle = getReportsDesktopChapterLabel(activeSection)")
      expect(desktopSource).toContain("{activeChapterTitle}")
    })

    it("omet la section Modules et ne contient aucune action non contextuelle par défaut", () => {
      const model = buildReportsRailProps({ active: "documents", onChange: () => {} })
      const html = renderNavigation()

      expect(model.contextualModules).toBeUndefined()
      expect(html).not.toContain(">Modules<")
      expect(html).not.toContain("CRM Launcher")
      expect(navigationSource).not.toContain("CRM Launcher")
      expect(navigationSource).not.toContain("useCrmAccountLauncherStore")
      expect(desktopSource).not.toContain("useCrmAccountLauncherStore")
    })

    it("alimente la section Modules avec Gestion de la connaissance quand onOpenKnowledgeManagement est fourni", () => {
      const onOpenKnowledgeManagement = vi.fn()
      const model = buildReportsRailProps({
        active: "documents",
        onChange: () => {},
        onOpenKnowledgeManagement,
      })

      expect(model.contextualModules).toHaveLength(1)
      expect(model.contextualModules?.[0]?.key).toBe("knowledge-management")
      expect(model.contextualModules?.[0]?.label).toBe("Gestion de la connaissance")
      expect(model.contextualModules?.[0]?.icon).toBeDefined()

      model.contextualModules?.[0]?.onSelect?.()
      expect(onOpenKnowledgeManagement).toHaveBeenCalledOnce()

      const html = renderNavigation({ onOpenKnowledgeManagement })
      expect(html).toContain(">Modules<")
      expect(html).toContain("Gestion de la connaissance")
    })

    it("connecte onOpenKnowledgeManagement à setManageListsOpen dans ReportsDesktopView", () => {
      expect(desktopSource).toContain("onOpenKnowledgeManagement={() => setManageListsOpen(true)}")
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

    it("conserve la vue Mobile intacte avec son propre état local", () => {
      expect(mobileSource).toContain('useState<ReportsSection>("documents")')
      expect(mobileSource).not.toContain("parseReportsSection")
    })
  })
})
