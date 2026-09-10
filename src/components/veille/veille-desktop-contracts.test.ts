import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  buildVeilleSectionHref,
  getSecondaryItems,
  healthFromRun,
  parseGlobalWatchSettings,
  parseMonthlyWatchAnalysisOutput,
  parseVeilleSection,
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
    [undefined, "news"],
    [null, "news"],
    ["news", "news"],
    ["watched-accounts", "watched-accounts"],
    ["strategic-analysis", "strategic-analysis"],
    ["history", "history"],
    ["unknown", "news"],
  ] as const)("parses the section query value %s as %s", (value, expected) => {
    expect(parseVeilleSection(value)).toBe(expected)
  })

  it("removes section for news while preserving every other query parameter", () => {
    const searchParams = new URLSearchParams(
      "topic=ia&digestId=abc&tab=veille&companyId=company-1&section=history",
    )

    expect(buildVeilleSectionHref("/veille", searchParams, "news")).toBe(
      "/veille?topic=ia&digestId=abc&tab=veille&companyId=company-1",
    )
  })

  it("adds a non-root section while preserving every other query parameter", () => {
    const searchParams = new URLSearchParams("topic=ia&digestId=abc")

    expect(buildVeilleSectionHref("/veille", searchParams, "strategic-analysis")).toBe(
      "/veille?topic=ia&digestId=abc&section=strategic-analysis",
    )
  })

  it("returns the pathname alone for the canonical empty news query", () => {
    expect(buildVeilleSectionHref("/veille", new URLSearchParams("section=news"), "news")).toBe(
      "/veille",
    )
  })

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
      { key: "news", label: "Actualités thématiques" },
      { key: "watched-accounts", label: "Veille Ciblée" },
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
    ).toEqual(["Actualités thématiques", "Veille Ciblée", "Analyses", "Archives"])
    expect(desktop).toContain("const activeChapterTitle = getVeilleDesktopChapterLabel(section)")
    expect(desktop).toContain("{activeChapterTitle}")
  })

  it("omet Modules sans callback et expose les 4 capacités cibles dans l'ordre avec leur état actif", () => {
    const onOpenSourceManagement = vi.fn()
    const onOpenKnowledgeManagement = vi.fn()
    const onOpenTransverseAnalysis = vi.fn()
    const onOpenWatchAnalysisMission = vi.fn()

    const withoutModule = buildVeilleRailProps({ active: "news", onChange: () => {} })
    expect(withoutModule.contextualModules).toBeUndefined()

    const withAllModules = buildVeilleRailProps({
      active: "news",
      onChange: () => {},
      activeModule: "transverse-analysis",
      onOpenSourceManagement,
      onOpenKnowledgeManagement,
      onOpenTransverseAnalysis,
      onOpenWatchAnalysisMission,
    })

    expect(withAllModules.contextualModules?.map((m) => ({ key: m.key, label: m.label }))).toEqual([
      { key: "source-management", label: "Gestion des sources" },
      { key: "knowledge-management", label: "Gestion de la connaissance" },
      { key: "transverse-analysis", label: "Analyse transverse" },
      { key: "watch-analysis-mission", label: "Mission : analyse de la veille" },
    ])

    expect(withAllModules.contextualModules?.map((m) => m.active)).toEqual([
      false,
      false,
      true,
      false,
    ])

    withAllModules.contextualModules?.[0]?.onSelect?.()
    expect(onOpenSourceManagement).toHaveBeenCalledOnce()

    withAllModules.contextualModules?.[1]?.onSelect?.()
    expect(onOpenKnowledgeManagement).toHaveBeenCalledOnce()

    withAllModules.contextualModules?.[2]?.onSelect?.()
    expect(onOpenTransverseAnalysis).toHaveBeenCalledOnce()

    withAllModules.contextualModules?.[3]?.onSelect?.()
    expect(onOpenWatchAnalysisMission).toHaveBeenCalledOnce()
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

  it("keeps the server-side Mobile branch separate with synchronized labels", () => {
    const mobileBranch = distributor.indexOf('if (device === "mobile")')
    const desktopBranch = distributor.indexOf("<VeilleActualitesDesktop")
    expect(mobileBranch).toBeGreaterThan(-1)
    expect(desktopBranch).toBeGreaterThan(mobileBranch)
    expect(distributor.slice(mobileBranch, desktopBranch)).toContain("<VeilleActualitesMobile")
    expect(distributor.slice(mobileBranch, desktopBranch)).not.toContain("globalWatchHealth=")

    const mobileFile = readFileSync(resolve(root, "src/components/veille/VeilleActualitesMobile.tsx"), "utf8")
    expect(mobileFile).toContain('{ id: "actualites", label: "Actualités thématiques" }')
    expect(mobileFile).toContain('{ id: "veille", label: "Veille Ciblée" }')
    expect(mobileFile).toContain('{ id: "analyses", label: "Analyses" }')
    expect(mobileFile).toContain('{ id: "archives", label: "Archives" }')
  })

  it("reutilises shared components without local duplication", () => {
    const missionWrapper = readFileSync(
      resolve(root, "src/features/veille/modules/WatchAnalysisMissionModule.tsx"),
      "utf8",
    )
    expect(missionWrapper).toContain('import { MissionComposerDesktop } from "@/features/intelligence-missions/components/MissionComposerDesktop"')
    expect(missionWrapper).toContain('import { VEILLE_MISSION_COMPOSER_CONFIG } from "@/features/intelligence-missions/components/mission-composer-model"')
    expect(missionWrapper).toContain('config={VEILLE_MISSION_COMPOSER_CONFIG}')

    expect(desktop).toContain('import { ManageCollectionsDesktop } from "@/features/content-collections/components/ManageCollectionsDesktop"')
    expect(desktop).toContain('import { WatchAnalysisComposerDesktop } from "@/features/watch-analysis/components/WatchAnalysisComposerDesktop"')
    expect(desktop).toContain('import { WATCH_ANALYSIS_COMPOSER_EVENT } from "@/lib/reports/watch-analysis-launcher"')
  })

  it("keeps URL navigation structural and lets history digest links return naturally to news", () => {
    expect(distributor).toContain('key={digest?.id ?? "veille-no-digest"}')
    expect(desktop).toContain("const searchParams = useSearchParams()")
    expect(desktop).toContain('const section = parseVeilleSection(searchParams.get("section"))')
    expect(desktop).toContain("router.push(buildVeilleSectionHref(pathname, searchParams, nextSection))")
    expect(desktop).not.toContain("useState<VeilleSection>")
    expect(desktop).not.toContain("setSection")
    expect(desktop).not.toContain("onOpenDigest")
    expect(desktop).toContain('href={`/veille?digestId=${digest.id}`}')
  })

  it("keeps the Mobile tab contract and contextual module contract unchanged", () => {
    const page = readFileSync(resolve(root, "src/app/(app)/veille/page.tsx"), "utf8")

    expect(page).toContain('resolvedParams.tab === "veille" || resolvedParams.tab === "analyses"')
    expect(page).toContain("initialMobileTab={initialTab}")
    expect(page).toContain("initialMobileAnalysisId={initialAnalysisId}")
    expect(desktop).toContain('onOpenSourceManagement={() => openWorkspaceModule("source-management")}')
    expect(navigation).toContain("contextualModules,")
  })
})
