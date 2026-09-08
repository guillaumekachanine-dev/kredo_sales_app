import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  buildReportsRailProps,
  getReportsDesktopChapterLabel,
  REPORTS_DESKTOP_CHAPTERS,
  ReportsLocalNavigation,
  type ReportsSection,
} from "./ReportsLocalNavigation"

const root = process.cwd()

function renderNavigation(options?: {
  active?: ReportsSection
}) {
  return renderToStaticMarkup(
    React.createElement(ReportsLocalNavigation, {
      active: options?.active ?? "documents",
      onChange: () => {},
    }),
  )
}

describe("ReportsLocalNavigation", () => {
  const desktopSource = readFileSync(
    resolve(root, "src/components/reports/ReportsDesktopView.tsx"),
    "utf8",
  )
  const navigationSource = readFileSync(
    resolve(root, "src/components/reports/ReportsLocalNavigation.tsx"),
    "utf8",
  )

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

  it("omet la section Modules et ne contient aucune action non contextuelle", () => {
    const model = buildReportsRailProps({ active: "documents", onChange: () => {} })
    const html = renderNavigation()

    expect(model.contextualModules).toBeUndefined()
    expect(html).not.toContain(">Modules<")
    expect(html).not.toContain("CRM Launcher")
    expect(navigationSource).not.toContain("CRM Launcher")
    expect(navigationSource).not.toContain("useCrmAccountLauncherStore")
    expect(desktopSource).not.toContain("useCrmAccountLauncherStore")
  })
})
