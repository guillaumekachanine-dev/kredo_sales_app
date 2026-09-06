import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  getSecondaryItems,
  healthFromRun,
  parseGlobalWatchSettings,
  parseMonthlyWatchAnalysisOutput,
  previousCalendarMonth,
  validateGlobalWatchSettings,
} from "./veille-desktop-contracts"

const root = process.cwd()

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

  it("uses the four requested local sections and modules section", () => {
    for (const label of ["Actualités", "Veille ciblée", "Analyses", "Archives"]) expect(navigation).toContain(label)
    expect(navigation).toContain("Modules")
    expect(navigation).toContain("Gestion des sources")
    expect(navigation).toContain('aria-current={isActive ? "page" : undefined}')
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
