import { readFileSync } from "node:fs"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { BusinessIntelligenceSignatureHeader } from "../header/BusinessIntelligenceSignatureHeader"
import {
  BI_CHAPTERS,
  getBiChapterLabel,
  replaceBiChapterInHref,
} from "../navigation/business-intelligence-chapters"
import { BusinessIntelligenceHeader } from "./BusinessIntelligenceHeader"
import {
  buildBusinessIntelligenceRailProps,
  BusinessIntelligenceLocalNavigation,
} from "./BusinessIntelligenceLocalNavigation"

const SEGMENT_ID = "20000000-0000-4000-8000-000000000000"

function renderNavigation(options?: {
  active?: "home" | "competitive-environment"
  withStudies?: boolean
  withPlaybooks?: boolean
}) {
  return renderToStaticMarkup(
    React.createElement(BusinessIntelligenceLocalNavigation, {
      active: options?.active ?? "home",
      onChange: () => {},
      onStudiesClick: options?.withStudies ? () => {} : undefined,
      onPlaybooksClick: options?.withPlaybooks ? () => {} : undefined,
    }),
  )
}

describe("BusinessIntelligenceLocalNavigation", () => {
  it("utilise le SectionRail canonique avec le chapeau Business Intelligence", () => {
    const html = renderNavigation()

    expect(html).toContain('aria-label="Navigation locale Business Intelligence"')
    expect(html).toContain("w-[11.5rem]")
    expect(html).toContain("bg-edito-navy")
    expect(html).toContain(">Business Intelligence<")
    expect(html).toContain(">Chapitres<")
  })

  it("mappe les six chapitres dans l'ordre de BI_CHAPTERS", () => {
    const model = buildBusinessIntelligenceRailProps({
      active: "home",
      onChange: () => {},
    })

    expect(model.chapters.map(({ key, label }) => ({ key, label }))).toEqual(
      BI_CHAPTERS.map(({ id, label }) => ({ key: id, label })),
    )
  })

  it("mappe activeChapter vers l'unique chapitre actif", () => {
    const model = buildBusinessIntelligenceRailProps({
      active: "competitive-environment",
      onChange: () => {},
    })

    expect(model.chapters.filter((chapter) => chapter.active).map((chapter) => chapter.key)).toEqual([
      "competitive-environment",
    ])
    expect(renderNavigation({ active: "competitive-environment" })).toMatch(
      /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Environnement concurrentiel<\/span>/,
    )
  })

  it("ramène le chapeau à tab=home pour le segment actif via la navigation existante", () => {
    const onChange = vi.fn()
    const model = buildBusinessIntelligenceRailProps({
      active: "sector-analysis",
      onChange,
    })

    model.home.onSelect?.()

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith("home")
    expect(
      replaceBiChapterInHref(
        `/intelligence?segment=${SEGMENT_ID}&tab=sector-analysis`,
        SEGMENT_ID,
        "home",
      ),
    ).toBe(`/intelligence?segment=${SEGMENT_ID}&tab=home`)
  })

  it("affiche Accueil dans le header principal pour l'état home", () => {
    const desktopSource = readFileSync(
      "src/features/business-intelligence/desktop/BusinessIntelligenceDesktop.tsx",
      "utf8",
    )
    const html = renderToStaticMarkup(
      React.createElement(BusinessIntelligenceHeader, {
        title: getBiChapterLabel("home"),
        segmentName: "Assurance",
        macroName: "Services financiers",
        status: "published",
        onChangeSegment: () => {},
      }),
    )

    expect(getBiChapterLabel("home")).toBe("Accueil")
    expect(html).toContain(">Accueil</h1>")
    expect(desktopSource).toContain("const activeChapterTitle = getBiChapterLabel(activeChapter)")
    expect(desktopSource.match(/title=\{activeChapterTitle\}/g)).toHaveLength(2)
    expect(desktopSource).not.toContain("CHAPTER_TITLES")
  })

  it("garde la signature cohérente avec le chapitre actif", () => {
    const title = getBiChapterLabel("sector-analysis")
    const html = renderToStaticMarkup(
      React.createElement(BusinessIntelligenceSignatureHeader, {
        activeChapter: "sector-analysis",
        title,
        segmentName: "Assurance",
      }),
    )

    expect(html).toContain(`>${title}</h1>`)
  })

  it("omet la section Modules lorsqu'aucune action contextuelle n'existe", () => {
    const model = buildBusinessIntelligenceRailProps({ active: "home", onChange: () => {} })
    const html = renderNavigation()

    expect(model.contextualModules).toEqual([])
    expect(html).not.toContain(">Modules<")
    expect(html).not.toContain("disabled")
  })

  it("ne rend que les modules contextuels dont le callback existe", () => {
    const studiesOnly = buildBusinessIntelligenceRailProps({
      active: "home",
      onChange: () => {},
      onStudiesClick: () => {},
    })
    const allModulesHtml = renderNavigation({ withStudies: true, withPlaybooks: true })

    expect(studiesOnly.contextualModules?.map((module) => module.key)).toEqual(["studies"])
    expect(allModulesHtml).toContain(">Modules<")
    expect(allModulesHtml).toContain("Études sectorielles")
    expect(allModulesHtml).toContain("Playbooks")
    expect(allModulesHtml).not.toContain("disabled")
    expect(
      buildBusinessIntelligenceRailProps({
        active: "home",
        onChange: () => {},
        onStudiesClick: () => {},
        onPlaybooksClick: () => {},
      }).contextualModules?.map((module) => module.key),
    ).toEqual(["studies", "playbooks"])
  })
})
