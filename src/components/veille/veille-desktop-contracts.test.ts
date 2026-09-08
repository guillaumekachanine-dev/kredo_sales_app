import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  getSecondaryItems,
  healthFromRun,
  parseGlobalWatchSettings,
  parseMonthlyWatchAnalysisOutput,
  previousCalendarMonth,
  type VeilleSection,
  validateGlobalWatchSettings,
} from "./veille-desktop-contracts"
import {
  buildVeilleRailProps,
  getVeilleDesktopChapterLabel,
  VEILLE_DESKTOP_CHAPTERS,
  VeilleLocalNavigation,
} from "./VeilleLocalNavigation"

const root = process.cwd()

function renderNavigation(options?: {
  active?: VeilleSection
  withSourceManagement?: boolean
}) {
  return renderToStaticMarkup(
    React.createElement(VeilleLocalNavigation, {
      active: options?.active ?? "news",
      onChange: () => {},
      onOpenSourceManagement: options?.withSourceManagement ? () => {} : undefined,
    }),
  )
}

describe("veille Desktop contracts", () => {
  it.each([
    ["queued", "En cours", "queued"],
    ["running", "En cours", "running"],
    ["succeeded", "OK", "succeeded"],
    ["failed", "Erreur", "failed"],
  ] as const)("maps %s to the visible workflow state", (status, label, state) => {
    const health = healthFromRun({
      workflowId: "global-watch",
      run: {
        id: "run-1",
        status,
        created_at: "2026-08-03T10:00:00.000Z",
        completed_at: status === "succeeded" ? "2026-08-03T10:03:00.000Z" : null,
        error_message: status === "failed" ? "boom" : null,
      },
    })
    expect(health.label).toBe(label)
    expect(health.state).toBe(state)
  })

  it("never reports OK without a configured, reliable run", () => {
    expect(healthFromRun({ workflowId: null, run: null })).toMatchObject({ label: "À contrôler", isConfigured: false })
    expect(healthFromRun({ workflowId: "global-watch", run: null })).toMatchObject({ label: "À contrôler", isConfigured: true })
  })

  it("validates and bounds the workspace watch settings", () => {
    expect(validateGlobalWatchSettings({ enabled: true, cadence: "weekly", maxArticles: 40 })).toMatchObject({ success: true })
    expect(validateGlobalWatchSettings({ enabled: true, cadence: "daily", maxArticles: 40 })).toMatchObject({ success: false })
    expect(validateGlobalWatchSettings({ enabled: true, cadence: "weekly", maxArticles: 101 })).toMatchObject({ success: false })
    expect(parseGlobalWatchSettings({ veille: { enabled: false, cadence: "weekly", maxArticles: 999 } })).toMatchObject({ enabled: false, maxArticles: 100 })
  })

  it("no longer exposes the dead sourceFamilies/categories fields", () => {
    const settings = parseGlobalWatchSettings(null)
    expect(settings).not.toHaveProperty("sourceFamilies")
    expect(settings).not.toHaveProperty("categories")
    expect(Object.keys(settings).sort()).toEqual([
      "cadence",
      "depth",
      "enabled",
      "exclusions",
      "intention",
      "interestTopics",
      "maxArticles",
      "sourceFamilyOverrides",
    ])
  })

  it("uses the complete previous calendar month", () => {
    expect(previousCalendarMonth(new Date("2026-08-03T12:00:00.000Z"))).toMatchObject({
      start: "2026-07-01",
      end: "2026-07-31",
    })
  })

  it("accepts a structured analysis and rejects incomplete output", () => {
    const output = {
      schemaVersion: 1,
      period: { start: "2026-07-01", end: "2026-07-31", label: "juillet 2026" },
      executiveSummary: "Synthèse",
      majorTrends: [], weakSignals: [], regulatoryDevelopments: [], commercialOpportunities: [], risksAndWatchpoints: [], priorityActions: [],
      coverage: { digestsCount: 4, articlesCount: 15, sourcesCount: 9 },
    }
    expect(parseMonthlyWatchAnalysisOutput(output)).toEqual(output)
    expect(parseMonthlyWatchAnalysisOutput({ schemaVersion: 1 })).toBeNull()
  })

  it("keeps three secondary articles, in rank order, without placeholders", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }]
    expect(getSecondaryItems(items, "b")).toEqual([{ id: "a" }, { id: "c" }, { id: "d" }])
  })
})

describe("veille Desktop UI source contract", () => {
  const desktop = readFileSync(resolve(root, "src/components/veille/VeilleActualitesDesktop.tsx"), "utf8")
  const rail = readFileSync(resolve(root, "src/components/veille/VeilleConvergencesRail.tsx"), "utf8")
  const header = readFileSync(resolve(root, "src/components/veille/VeilleHeaderActions.tsx"), "utf8")
  const navigation = readFileSync(resolve(root, "src/components/veille/VeilleLocalNavigation.tsx"), "utf8")
  const distributor = readFileSync(resolve(root, "src/components/veille/VeilleActualitesPage.tsx"), "utf8")
  const dialogDesktop = readFileSync(
    resolve(root, "src/features/veille/digest/components/DigestLaunchDialogDesktop.tsx"),
    "utf8",
  )

  it("utilise le SectionRail canonique avec le chapeau Veille & actualités", () => {
    const html = renderNavigation()

    expect(navigation).toContain("<SectionRail")
    expect(html).toContain('aria-label="Navigation locale Veille &amp; actualités"')
    expect(html).toContain("w-[11.5rem]")
    expect(html).toContain("bg-edito-navy")
    expect(html).toContain("Veille &amp; actualités")
    expect(html).toContain(">Chapitres<")
  })

  it("préserve les quatre identifiants, libellés et leur ordre", () => {
    expect(VEILLE_DESKTOP_CHAPTERS.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: "news", label: "Actualités" },
      { key: "watched-accounts", label: "Veille ciblée" },
      { key: "strategic-analysis", label: "Analyses" },
      { key: "history", label: "Archives" },
    ])

    const model = buildVeilleRailProps({ active: "news", onChange: () => {} })
    expect(model.chapters.map(({ key, label }) => ({ key, label }))).toEqual(
      VEILLE_DESKTOP_CHAPTERS.map(({ key, label }) => ({ key, label })),
    )
    expect(model.chapters.every((chapter) => chapter.icon)).toBe(true)
  })

  it("mappe VeilleSection vers l'unique chapitre actif", () => {
    const model = buildVeilleRailProps({
      active: "strategic-analysis",
      onChange: () => {},
    })

    expect(model.chapters.filter((chapter) => chapter.active).map((chapter) => chapter.key)).toEqual([
      "strategic-analysis",
    ])
    expect(renderNavigation({ active: "strategic-analysis" })).toMatch(
      /aria-current="page"[^>]*><span[^>]*>.*?<\/span><span[^>]*>Analyses<\/span>/,
    )
  })

  it("ramène le chapeau à la section racine news", () => {
    const onChange = vi.fn()
    const model = buildVeilleRailProps({ active: "history", onChange })

    model.home.onSelect?.()

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith("news")
  })

  it("dérive le titre principal exact depuis la configuration des chapitres", () => {
    expect(
      VEILLE_DESKTOP_CHAPTERS.map((chapter) => getVeilleDesktopChapterLabel(chapter.key)),
    ).toEqual(["Actualités", "Veille ciblée", "Analyses", "Archives"])
    expect(desktop).toContain("const activeChapterTitle = getVeilleDesktopChapterLabel(section)")
    expect(desktop).toContain("{activeChapterTitle}")
  })

  it("omet Modules sans callback et ne conserve que la gestion des sources contextuelle", () => {
    const withoutModule = buildVeilleRailProps({ active: "news", onChange: () => {} })
    const withoutModuleHtml = renderNavigation()
    const withModule = buildVeilleRailProps({
      active: "news",
      onChange: () => {},
      onOpenSourceManagement: () => {},
    })
    const withModuleHtml = renderNavigation({ withSourceManagement: true })

    expect(withoutModule.contextualModules).toEqual([])
    expect(withoutModuleHtml).not.toContain(">Modules<")
    expect(withModule.contextualModules?.map((module) => module.key)).toEqual(["source-management"])
    expect(withModuleHtml).toContain(">Modules<")
    expect(withModuleHtml).toContain("Gestion des sources")
    expect(withModuleHtml).not.toContain("CRM Launcher")
    expect(withModuleHtml).not.toContain("disabled")
  })

  it("has the exact header actions and no page subtitle", () => {
    expect(header).toContain("Générer un digest")
    expect(header).toContain("Configurer la veille")
    expect(desktop).not.toContain("Signaux stratégiques, analyses brèves et actions commerciales")
    expect(desktop).not.toContain("Ajouter au digest")
  })

  it("contains both accessible dialogs and the editorial synchronization path", () => {
    expect(header).toContain("<DigestLaunchDialogDesktop")
    expect(dialogDesktop).toContain('title="Générer un digest"')
    expect(header).toContain("<GlobalWatchSettingsDialog")
    expect(desktop).toContain("setSelectedArticle(article)")
    expect(desktop).toContain("headingRef.current?.focus()")
    expect(desktop).toContain("<VeilleConvergencesRail")
    expect(desktop).toContain("VerticalArticleRail")
    expect(rail).toContain("Non détecté")
  })

  it("keeps the server-side Mobile branch separate", () => {
    const mobileBranch = distributor.indexOf('if (device === "mobile")')
    const desktopBranch = distributor.indexOf("<VeilleActualitesDesktop")
    expect(mobileBranch).toBeGreaterThan(-1)
    expect(desktopBranch).toBeGreaterThan(mobileBranch)
    expect(distributor.slice(mobileBranch, desktopBranch)).toContain("<VeilleActualitesMobile")
    expect(distributor.slice(mobileBranch, desktopBranch)).not.toContain("globalWatchHealth=")
  })

  it("resets desktop reader on digest change and switches to news section on history digest click", () => {
    expect(distributor).toContain('key={digest?.id ?? "veille-no-digest"}')
    expect(desktop).toContain('onOpenDigest={() => setSection("news")}')
    expect(desktop).toContain("onClick={() => onOpenDigest?.()}")
  })
})
