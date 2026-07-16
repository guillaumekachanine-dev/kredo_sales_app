import { describe, expect, it } from "vitest"
import type { WeeklyManagerContent } from "@/app/(app)/reports/_data/reports-types"
import type { CockpitSignalItem } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"
import {
  buildCockpitSignalComposerRequest,
  COCKPIT_DIAGNOSTIC_ARBITRATIONS_LABEL,
  COCKPIT_WEEKLY_BRIEF_SECTION_IDS,
  getCockpitSignalVisualLevel,
  getCockpitWeeklyBriefSections,
} from "./cockpit-mobile-module-presenters"

function weeklyBrief(): WeeklyManagerContent {
  return {
    facts: {
      period: {
        startDate: "2026-07-13",
        endDate: "2026-07-19",
        asOfDate: "2026-07-16",
        weekIso: "2026-W29",
      },
      scope: { ownerId: "owner-1", isWorkspaceWide: false },
      workload: {
        calendarEventsCount: 3,
        tasksDueCount: 2,
        overdueOpenTasksCount: 1,
        actionableItemsCount: 6,
        conflictCount: 1,
        denseDaysCount: 2,
      },
      agendaByDay: [],
      commercial: {
        weightedPipeThisWeek: 120_000,
        staleOpportunitiesCount: 1,
        staleOpportunities: [{
          id: "opp-1",
          title: "Renouvellement Acme",
          companyId: "company-1",
          companyName: "Acme",
          daysSinceLastAction: 12,
          weightedGain: 30_000,
        }],
        quietTargetAccountsCount: 1,
        quietTargetAccounts: [{ id: "company-2", name: "Silence SA", lastContactAt: null }],
        nextActionsCount: 2,
      },
      delivery: {
        lowMarginMissionsCount: 1,
        lowMarginMissions: [{
          id: "mission-1",
          title: "Mission sensible",
          companyId: "company-1",
          companyName: "Acme",
          grossMarginPct: 18,
        }],
        lowActivityCollaboratorsCount: 1,
        lowActivityCollaborators: [{ id: "collab-1", fullName: "Mina Martin", activityRatePercent: 40 }],
        missionStartsCount: 1,
        missionEndsCount: 0,
      },
      recruitment: {
        openPositioningCount: 2,
        pendingOffersCount: 1,
        pendingOffers: [{ id: "offer-1", candidateName: "Léa Dupont", offerStatus: "sent", deadline: null }],
        milestonesCount: 1,
      },
      priorities: [{
        rank: 1,
        sourceType: "opportunity",
        sourceId: "opp-1",
        title: "PRIORITÉ À NE PAS DUPLIQUER",
        reason: "Closing proche",
        tier: "critical",
        recommendedAction: "Vérifier le closing",
        scoringVersion: "weekly-scoring-v1",
      }],
      dataCutoffAt: "2026-07-16T08:00:00.000Z",
      caveats: ["Couverture partielle des CRA"],
    },
    narrative: {
      executiveSummary: "La semaine demande deux arbitrages.",
      weeklyFocus: ["Sécuriser le pipe", "Répartir la charge"],
      topPriorities: [{
        title: "PRIORITÉ À NE PAS DUPLIQUER",
        whyNow: "Maintenant",
        recommendedAction: "Agir",
        expectedImpact: "Impact",
      }],
      risks: ["Risque de surcharge"],
      warnings: ["Prévision incomplète"],
      suggestedTasks: [],
    },
    sourceRefs: [],
    qaFlags: [{ check: "coverage", passed: false, detail: "Deux comptes sans activité" }],
  }
}

function accountSignal(): CockpitSignalItem {
  return {
    id: "signal-1",
    source: "account_signal",
    title: "Acme ouvre un nouveau site",
    category: "expansion",
    summary: "Un investissement est annoncé.",
    globalScore: 0.86,
    scoreJustification: "Preuve récente et compte prioritaire.",
    lastEvidenceAt: "2026-07-15T08:00:00.000Z",
    expiresAt: null,
    isStrong: true,
    recommendedAction: "Proposer un échange de cadrage.",
    companyId: "company-1",
    companyName: "Acme",
    suggestedContactId: "contact-1",
    suggestedContactName: "Alice Martin",
    href: "/prospection/accounts/company-1",
    sourceUrl: null,
  }
}

describe("cockpit mobile understanding modules", () => {
  it("mappe exactement les quatre sections du brief sans répéter les priorités", () => {
    const sections = getCockpitWeeklyBriefSections(weeklyBrief())

    expect(sections.map((section) => section.id)).toEqual(COCKPIT_WEEKLY_BRIEF_SECTION_IDS)
    expect(JSON.stringify(sections)).not.toContain("PRIORITÉ À NE PAS DUPLIQUER")
    expect(sections.find((section) => section.id === "business")?.metrics).toContainEqual({
      label: "Closings à risque",
      value: "1",
    })
  })

  it("conserve les alertes QA dans Vigilances", () => {
    const sections = getCockpitWeeklyBriefSections(weeklyBrief())

    expect(sections.find((section) => section.id === "vigilances")?.qaFlags).toEqual([
      { check: "coverage", passed: false, detail: "Deux comptes sans activité" },
    ])
  })

  it("renomme uniquement la présentation des priorités diagnostic", () => {
    expect(COCKPIT_DIAGNOSTIC_ARBITRATIONS_LABEL).toBe("Arbitrages recommandés")
  })

  it("transmet compte, signal et contact suggéré au composer existant", () => {
    const request = buildCockpitSignalComposerRequest(accountSignal())

    expect(request).toMatchObject({
      origin: "veille_signal",
      companyId: "company-1",
      contactId: "contact-1",
      contextReferences: { companyRef: "company-1", signalRef: "signal-1" },
      preset: { scenario: "signal_outreach", contactId: "contact-1" },
    })
    expect(request?.initialBrief?.context.mustInclude).toContain("Acme ouvre un nouveau site")
  })

  it("distingue le fallback veille sans inventer de contexte compte", () => {
    const fallback: CockpitSignalItem = {
      ...accountSignal(),
      id: "article-1",
      source: "veille_article",
      globalScore: null,
      scoreJustification: null,
      isStrong: false,
      companyId: null,
      companyName: null,
      suggestedContactId: null,
      suggestedContactName: null,
      href: "https://example.com/article",
      sourceUrl: "https://example.com/article",
    }

    expect(getCockpitSignalVisualLevel(fallback)).toBe("veille")
    expect(buildCockpitSignalComposerRequest(fallback)).toBeNull()
  })
})
