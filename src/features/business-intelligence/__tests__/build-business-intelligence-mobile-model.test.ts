import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  buildBusinessIntelligenceMobileModel,
  getMobileSectorAccounts,
  resolveMobilePriorityAccountId,
  resolveMobileSectorAccountId,
  resolveMobileWindowAccountId,
} from "../presenters/build-business-intelligence-mobile-model"
import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"

const snapshot = {
  state: "ready",
  generatedAt: "2026-07-17T00:00:00.000Z",
  dataQuality: { hasDemoData: true, syntheticInteractionsCount: 2, realInteractionsCount: 3, limitations: [] },
  trust: {},
  accounts: [
    { id: "account-30", name: "Compte 30", sectorId: "active-sector", actionPriorityScore30d: 91, actionPriorityScore90d: 40, actionPriorityScore180d: 35, potentialScore: 90, reachScore: 30, momentumScore30d: 85, momentumScore90d: 20, momentumScore180d: 10, legacyFolioScore: null, nextDecision: "Appeler le sponsor" },
    { id: "account-90", name: "Compte 90", sectorId: "active-sector", actionPriorityScore30d: 70, actionPriorityScore90d: 94, actionPriorityScore180d: 76, potentialScore: 75, reachScore: 60, momentumScore30d: 55, momentumScore90d: 90, momentumScore180d: 70, legacyFolioScore: 4, nextDecision: null },
  ],
  scores: {
    "account-30": { scoreValue: 88, scoreBand: "A", confidenceScore: 92, scoreVersion: "v1", calculatedAt: "2026-07-17T00:00:00.000Z", summary: "Score natif", components: [{ label: "Maturité", normalizedScore: 80 }] },
  },
  signals: [{ id: "signal-1", companyId: "account-30", title: "Signal urgent", summary: "Une échéance approche", category: "regulation", relevanceScore: 0.8, urgencyScore: 90, detectedAt: "2026-07-16", recommendedAction: "Préparer un atelier" }],
  windows: [{ id: "window-1", sectorId: "active-sector", sectorName: "Secteur actif", sourceType: "regulation", sourceId: "source-1", sourceLabel: "Autorité", sourceUrl: null, dataOrigin: "REAL_NATIVE", sectorSlug: "secteur-actif", title: "Échéance", subtitle: "Contexte", practiceKey: "data_ai", practiceLabel: "Data & AI", detectedAt: "2026-07-16", deadlineAt: "2026-07-30", temporalStatus: "close", freshnessBand: "hot", urgencyScore: 90, priorityBand: "critical", isOpenNow: true, exposedAccountIds: ["account-30"], exposedAccountCount: 1, averagePotentialScore: 90, averageReachScore: 30, coverageGap: 70, suggestedAction: "Préparer un atelier", playbookSummary: "Angle", sectorAttractivenessScore: 88 }],
  sectors: [
    { id: "active-sector", slug: "secteur-actif", name: "Secteur actif", status: "active", attractivenessScore: 88, linkedAccountCount: 2, openWindowCount: 1, topPracticeLabel: "Data & AI", averageReachScore: 45, practiceScores: {}, playbook: {}, painPoints: [] },
    { id: "watch-sector", slug: "secteur-veille", name: "Secteur veille", status: "watch", attractivenessScore: null, linkedAccountCount: 0, openWindowCount: 0, topPracticeLabel: "Cyber", averageReachScore: null, practiceScores: {}, playbook: {}, painPoints: [] },
  ],
} as unknown as BusinessIntelligenceSnapshot

describe("Business Intelligence Mobile presenter", () => {
  it("est déterministe, ne mute pas le snapshot et signale les données de démonstration", () => {
    const original = structuredClone(snapshot)
    expect(buildBusinessIntelligenceMobileModel(snapshot)).toEqual(buildBusinessIntelligenceMobileModel(snapshot))
    expect(snapshot).toEqual(original)
    expect(buildBusinessIntelligenceMobileModel(snapshot).hasDemoData).toBe(true)
  })

  it("calcule les vues 30 / 90 / 180 jours et change le compte recommandé", () => {
    const model = buildBusinessIntelligenceMobileModel(snapshot)
    expect(model.periods[30].recommendedAccountId).toBe("account-30")
    expect(model.periods[90].recommendedAccountId).toBe("account-90")
    expect(model.periods[180].accounts[0]?.momentum).not.toBe(model.periods[30].accounts[0]?.momentum)
  })

  it("conserve les sélections de compte et sélectionne le compte exposé depuis une fenêtre", () => {
    const model = buildBusinessIntelligenceMobileModel(snapshot)
    expect(resolveMobilePriorityAccountId(model.periods[30].accounts, "account-90")).toBe("account-90")
    expect(resolveMobilePriorityAccountId(model.periods[30].accounts, "unknown")).toBe("account-30")
    expect(resolveMobileWindowAccountId(model.windows[0]!)).toBe("account-30")
  })

  it("conserve toutes les fenêtres pour la modale exhaustive, le rendu mobile en limite cinq", () => {
    const windows = Array.from({ length: 6 }, (_, index) => ({
      ...snapshot.windows[0]!,
      id: `window-${index + 1}`,
    }))
    const model = buildBusinessIntelligenceMobileModel({ ...snapshot, windows })

    expect(model.windows).toHaveLength(6)
    expect(readFileSync("src/features/business-intelligence/mobile/BusinessIntelligenceMobile.tsx", "utf8")).toContain("limit={5}")
  })

  it("préserve les UUID de secteur et ne fabrique pas de playbook pour un secteur watch", () => {
    const model = buildBusinessIntelligenceMobileModel(snapshot)
    expect(model.activeSectors[0]?.id).toBe("active-sector")
    expect(model.watchSectors[0]?.id).toBe("watch-sector")
    expect(model.watchSectors[0]?.profile?.playbook.personas).toEqual([])
    expect(model.watchSectors[0]?.profile?.summary).toBe("Étude sectorielle en préparation")
  })

  it("applique un secteur par UUID, sélectionne son premier compte et revient à tous les secteurs", () => {
    const model = buildBusinessIntelligenceMobileModel(snapshot)
    const period = model.periods[30]

    expect(getMobileSectorAccounts(period, "active-sector").map((account) => account.accountId)).toEqual([
      "account-30",
      "account-90",
    ])
    expect(resolveMobileSectorAccountId(period, "active-sector", "account-90")).toBe("account-90")
    expect(resolveMobileSectorAccountId(period, "active-sector", null)).toBe("account-30")
    expect(getMobileSectorAccounts(period, "watch-sector")).toEqual([])
    expect(resolveMobileSectorAccountId(period, "watch-sector", null)).toBeNull()
    expect(getMobileSectorAccounts(period, "all")).toBe(period.accounts)
    expect(resolveMobileSectorAccountId(period, "all", null)).toBe("account-30")
  })

  it("assume l'absence de score natif et les états vides", () => {
    const model = buildBusinessIntelligenceMobileModel(snapshot)
    expect(model.periods[30].accounts.find((account) => account.accountId === "account-90")?.nativeScore).toBeNull()
    const empty = buildBusinessIntelligenceMobileModel({ ...snapshot, accounts: [], scores: {}, signals: [], windows: [], sectors: [] })
    expect(empty.periods[30].recommendedAccountId).toBeNull()
    expect(empty.windows).toEqual([])
    expect(empty.activeSectors).toEqual([])
  })

  it("ne monte jamais le Desktop dans la branche Mobile de la route", () => {
    const source = readFileSync("src/app/(app)/intelligence/page.tsx", "utf8")
    const mobileBranch = source.split('if (device === "mobile")')[1]?.split("// Load snapshot")[0] ?? ""
    expect(mobileBranch).toContain("BusinessIntelligenceMobile")
    expect(mobileBranch).not.toContain("BusinessIntelligenceDesktop")
  })
})
