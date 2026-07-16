import type { WeeklyManagerContent } from "@/app/(app)/reports/_data/reports-types"
import { buildCommunicationEntryPreset } from "@/lib/communication/communication-entry-intents"
import type { CommunicationComposerRequest } from "@/lib/communication/communication-composer"
import type { CockpitSignalItem } from "@/lib/cockpit/mobile/cockpit-mobile-snapshot-types"

export const COCKPIT_WEEKLY_BRIEF_SECTION_IDS = [
  "essential",
  "business",
  "delivery",
  "vigilances",
] as const

export const COCKPIT_DIAGNOSTIC_ARBITRATIONS_LABEL = "Arbitrages recommandés"

export type CockpitWeeklyBriefSectionId = (typeof COCKPIT_WEEKLY_BRIEF_SECTION_IDS)[number]

export interface CockpitWeeklyBriefMetric {
  label: string
  value: string
}

export interface CockpitWeeklyBriefSection {
  id: CockpitWeeklyBriefSectionId
  title: string
  summary: string | null
  items: string[]
  metrics: CockpitWeeklyBriefMetric[]
  qaFlags: WeeklyManagerContent["qaFlags"]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(value))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

function countClosingRisks(content: WeeklyManagerContent) {
  return content.facts.priorities.filter((priority) => (
    priority.sourceType === "opportunity"
    && priority.recommendedAction.toLocaleLowerCase("fr-FR").includes("closing")
  )).length
}

export function getCockpitWeeklyBriefSections(
  content: WeeklyManagerContent,
): CockpitWeeklyBriefSection[] {
  const { facts, narrative } = content
  const businessMetrics: CockpitWeeklyBriefMetric[] = [
    { label: "Opportunités stagnantes", value: String(facts.commercial.staleOpportunitiesCount) },
    { label: "Next steps attendues", value: String(facts.commercial.nextActionsCount) },
    { label: "Closings à risque", value: String(countClosingRisks(content)) },
    { label: "Comptes silencieux", value: String(facts.commercial.quietTargetAccountsCount) },
  ]

  if (Number.isFinite(facts.commercial.weightedPipeThisWeek)) {
    businessMetrics.push({
      label: "Pipeline pondéré utile",
      value: formatCurrency(facts.commercial.weightedPipeThisWeek),
    })
  }

  return [
    {
      id: "essential",
      title: "L’essentiel",
      summary: narrative.executiveSummary,
      items: narrative.weeklyFocus,
      metrics: [
        { label: "Période", value: `${formatDate(facts.period.startDate)} — ${formatDate(facts.period.endDate)}` },
        { label: "Fraîcheur", value: `Données au ${formatDate(facts.dataCutoffAt)}` },
      ],
      qaFlags: [],
    },
    {
      id: "business",
      title: "Business",
      summary: null,
      items: [
        ...facts.commercial.staleOpportunities.map((item) => (
          item.companyName ? `${item.title} · ${item.companyName}` : item.title
        )),
        ...facts.commercial.quietTargetAccounts.map((item) => `${item.name} · compte silencieux`),
      ],
      metrics: businessMetrics,
      qaFlags: [],
    },
    {
      id: "delivery",
      title: "Delivery & talents",
      summary: null,
      items: [
        ...facts.delivery.lowMarginMissions.map((item) => (
          item.companyName ? `${item.title} · ${item.companyName}` : item.title
        )),
        ...facts.delivery.lowActivityCollaborators.map((item) => (
          item.fullName ?? "Collaborateur sans nom renseigné"
        )),
        ...facts.recruitment.pendingOffers.map((item) => (
          item.candidateName ?? "Offre candidat sans nom renseigné"
        )),
      ],
      metrics: [
        { label: "Missions à marge faible", value: String(facts.delivery.lowMarginMissionsCount) },
        { label: "Activité faible", value: String(facts.delivery.lowActivityCollaboratorsCount) },
        { label: "Staffings ouverts", value: String(facts.recruitment.openPositioningCount) },
        { label: "Offres en attente", value: String(facts.recruitment.pendingOffersCount) },
        { label: "Jalons recrutement", value: String(facts.recruitment.milestonesCount) },
      ],
      qaFlags: [],
    },
    {
      id: "vigilances",
      title: "Vigilances",
      summary: null,
      items: [
        ...narrative.risks,
        ...(narrative.warnings ?? []),
        ...facts.caveats,
      ],
      metrics: [
        { label: "Conflits", value: String(facts.workload.conflictCount) },
        { label: "Jours denses", value: String(facts.workload.denseDaysCount) },
        { label: "Tâches en retard", value: String(facts.workload.overdueOpenTasksCount) },
      ],
      qaFlags: content.qaFlags,
    },
  ]
}

export type CockpitSignalVisualLevel = "strong" | "active" | "veille"

export function getCockpitSignalVisualLevel(signal: CockpitSignalItem): CockpitSignalVisualLevel {
  if (signal.source === "veille_article") return "veille"
  return signal.isStrong ? "strong" : "active"
}

export function buildCockpitSignalComposerRequest(
  signal: CockpitSignalItem,
): CommunicationComposerRequest | null {
  if (signal.source !== "account_signal" || !signal.companyId) return null

  const details = [
    `Signal : ${signal.title}`,
    signal.summary ? `Résumé : ${signal.summary}` : null,
    signal.scoreJustification ? `Justification du score : ${signal.scoreJustification}` : null,
    signal.recommendedAction ? `Action recommandée : ${signal.recommendedAction}` : null,
  ].filter(Boolean).join("\n")

  const preset = buildCommunicationEntryPreset("signal_outreach", {
    origin: "veille_signal",
    companyId: signal.companyId,
    companyName: signal.companyName,
    contactId: signal.suggestedContactId,
    contactName: signal.suggestedContactName,
    signalId: signal.id,
    mustInclude: details,
  })

  return preset.ok ? preset.request : null
}
