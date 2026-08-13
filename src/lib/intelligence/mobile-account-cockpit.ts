import type {
  ClientIntelligenceCommercialTimelineEntry,
  ClientIntelligenceData,
  ClientIntelligenceIssue,
  ClientIntelligenceMission,
  ClientIntelligenceOpportunity,
  ClientIntelligenceSignal,
  ClientIntelligenceVeilleArticle,
} from "@/lib/intelligence/intelligence-data"
import { selectPrimaryCommercialWindow } from "@/lib/intelligence/client-intelligence-home"
import { isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import { KREDO_TIME_ZONE } from "@/lib/formatting/date-fr"

type MobileCockpitSource = Pick<
  ClientIntelligenceData,
  | "company"
  | "contacts"
  | "opportunities"
  | "missions"
  | "commercialTimeline"
  | "veilleArticles"
  | "accountSignals"
  | "accountIssues"
  | "sectorSnapshot"
>

export type MobileCockpitActionKind =
  | "agenda"
  | "actuality"
  | "opportunity"
  | "development"
  | "veille"

export type MobileCockpitFeature = {
  id: string
  title: string
  context: string | null
  meta: string | null
  ctaLabel: string
  actionKind: MobileCockpitActionKind
  href?: string
  signalId?: string
  signalTitle?: string
  contactId?: string
  contactName?: string
  opportunityId?: string
  opportunityTitle?: string
  missionId?: string
  missionTitle?: string
  eventId?: string
  eventTitle?: string
  eventStartsAt?: string
}

export type MobileCockpitUpcomingItem = {
  id: string
  label: string
  timing: string
  href: string
  overdue: boolean
}

export type MobileAccountCockpit = {
  stateLabel: string
  accountSummary: string
  nowAction: MobileCockpitFeature
  actuality: MobileCockpitFeature
  opportunityWindow: MobileCockpitFeature
  developmentAction: MobileCockpitFeature
  upcoming: MobileCockpitUpcomingItem[]
}

const CANCELLED_EVENT_STATUSES = new Set(["cancelled", "canceled", "annule", "annulee"])
const ACTIVE_MISSION_STATUSES = new Set(["active", "en_cours", "ongoing"])
const DAY_MS = 86_400_000

function parsed(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function sentence(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ")
  if (!normalized) return null
  const repaired = normalized
    .replace(/\b([ld]) ([aeiouyh])/gi, "$1'$2")
    .replace(/^./, (character) => character.toUpperCase())
  return /[.!?]$/.test(repaired) ? repaired : `${repaired}.`
}

function titleCaseName(value: string | null): string | null {
  if (!value) return null
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.length <= 3 && part === part.toUpperCase()
      ? part
      : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

function formatEventDate(value: string): string {
  const date = parsed(value)
  if (!date) return value
  const dayDate = new Intl.DateTimeFormat("fr-FR", {
    timeZone: KREDO_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date)
  const time = new Intl.DateTimeFormat("fr-FR", {
    timeZone: KREDO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
  const label = dayDate.replace(/\.$/, "")
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} · ${time}`
}

function formatCompactEventTiming(value: string): string {
  const date = parsed(value)
  if (!date) return value
  const weekday = new Intl.DateTimeFormat("fr-FR", {
    timeZone: KREDO_TIME_ZONE,
    weekday: "short",
  }).format(date)
  const time = new Intl.DateTimeFormat("fr-FR", {
    timeZone: KREDO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${time}`
}

function formatArticleDate(value: string): string {
  const date = parsed(value)
  if (!date) return value
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: KREDO_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(date).replace(/\.$/, "")
}

function weekday(value: string): string {
  const date = parsed(value)
  if (!date) return "à venir"
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: KREDO_TIME_ZONE,
    weekday: "long",
  }).format(date)
}

function formatMoney(value: number): string {
  if (Math.abs(value) >= 1_000) {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value / 1_000)} k€`
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

function daysUntil(value: string | null, now: Date): number | null {
  const date = parsed(value)
  if (!date) return null
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS)
}

function isActiveMission(mission: ClientIntelligenceMission): boolean {
  return ACTIVE_MISSION_STATUSES.has(mission.status.toLowerCase())
}

function openOpportunities(opportunities: ClientIntelligenceOpportunity[]) {
  return opportunities.filter((opportunity) => !isTerminalOpportunityStage(opportunity.stage))
}

function futureEvents(
  timeline: ClientIntelligenceCommercialTimelineEntry[],
  now: Date,
): ClientIntelligenceCommercialTimelineEntry[] {
  return timeline
    .filter((entry) => entry.source === "calendar_event")
    .filter((entry) => !CANCELLED_EVENT_STATUSES.has(entry.status?.toLowerCase() ?? ""))
    .filter((entry) => (parsed(entry.occurredAt)?.getTime() ?? 0) >= now.getTime())
    .toSorted((a, b) => a.occurredAt.localeCompare(b.occurredAt))
}

function compactEventLabel(entry: ClientIntelligenceCommercialTimelineEntry): string {
  if (/copil/i.test(entry.title)) return "COPIL mission"
  if (/suivi consultant/i.test(entry.title)) return "Suivi consultant"
  const firstPart = entry.title.split(/\s+[–—-]\s+/)[0]?.trim()
  return firstPart || entry.title
}

function calendarEventId(entry: ClientIntelligenceCommercialTimelineEntry): string {
  return entry.id.startsWith("calendar-") ? entry.id.slice("calendar-".length) : entry.id
}

function meetingAction(entry: ClientIntelligenceCommercialTimelineEntry): MobileCockpitFeature {
  const contactName = titleCaseName(entry.contactName)
  const meetingLabel = /copil/i.test(entry.title) ? "le COPIL" : compactEventLabel(entry)
  return {
    id: `event:${entry.id}`,
    title: `Préparer ${meetingLabel}${contactName ? ` avec ${contactName}` : ""}`,
    context: null,
    meta: formatEventDate(entry.occurredAt),
    ctaLabel: "Préparer",
    actionKind: "agenda",
    href: `/agenda?eventId=${calendarEventId(entry)}`,
    eventId: calendarEventId(entry),
    eventTitle: entry.title,
    eventStartsAt: entry.occurredAt,
  }
}

export function selectNowAction(data: MobileCockpitSource, now: Date): MobileCockpitFeature {
  const events = futureEvents(data.commercialTimeline, now)
  const upcomingCopil = events.find((entry) => /copil|comite.*pilotage/i.test(entry.title))
  if (upcomingCopil && daysUntil(upcomingCopil.occurredAt, now)! <= 7) {
    return meetingAction(upcomingCopil)
  }

  const imminentMeeting = events.find((entry) => daysUntil(entry.occurredAt, now)! <= 2)
  if (imminentMeeting) return meetingAction(imminentMeeting)

  const overdueOpportunity = openOpportunities(data.opportunities)
    .filter((opportunity) => (parsed(opportunity.nextActionAt)?.getTime() ?? Infinity) < now.getTime())
    .toSorted((a, b) => (b.estimatedGain ?? 0) - (a.estimatedGain ?? 0))[0]
  if (overdueOpportunity) {
    return {
      id: `opportunity:${overdueOpportunity.id}`,
      title: sentence(overdueOpportunity.nextActionLabel) ?? `Relancer ${overdueOpportunity.title}`,
      context: overdueOpportunity.title,
      meta: "Action en retard",
      ctaLabel: "Traiter",
      actionKind: "opportunity",
      href: `/missions/opps/${overdueOpportunity.id}/modifier`,
      opportunityId: overdueOpportunity.id,
      opportunityTitle: overdueOpportunity.title,
    }
  }

  if (events[0]) return meetingAction(events[0])

  return {
    id: "plan-next-action",
    title: "Définir la prochaine action commerciale",
    context: "Aucune échéance prioritaire n’est planifiée.",
    meta: null,
    ctaLabel: "Planifier",
    actionKind: "agenda",
    href: "/agenda",
  }
}

function actionableArticle(articles: ClientIntelligenceVeilleArticle[]): ClientIntelligenceVeilleArticle | null {
  return articles
    .filter((article) => article.commercialAction.trim().length > 0)
    .toSorted((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))[0] ?? null
}

function inferSignalSource(signal: ClientIntelligenceSignal): string {
  const suffix = signal.title.match(/\s+-\s+([\w.-]+)$/)?.[1]
  if (suffix) return suffix.replace(/\.com$/i, "")
  return signal.primarySource?.source_name ?? "Veille Kredo"
}

function cleanSignalTitle(signal: ClientIntelligenceSignal): string {
  return signal.title.replace(/\s+-\s+[\w.-]+$/, "").trim()
}

export function selectActualityInsight(data: MobileCockpitSource): MobileCockpitFeature {
  const article = actionableArticle(data.veilleArticles)
  if (article) {
    return {
      id: `article:${article.id}`,
      title: article.title,
      context: null,
      meta: `${formatArticleDate(article.publishedAt ?? article.createdAt)} · ${article.sourceName}`,
      ctaLabel: "Rebondir",
      actionKind: "actuality",
      href: article.sourceUrl,
      signalTitle: article.title,
    }
  }

  const signal = data.accountSignals
    .filter((candidate) => candidate.recommendedAction || candidate.interestScore > 0)
    .toSorted((a, b) => {
      const dateDelta = (b.publishedAt ?? b.detectedAt).localeCompare(a.publishedAt ?? a.detectedAt)
      return dateDelta || b.interestScore - a.interestScore
    })[0]
  if (signal) {
    return {
      id: `signal:${signal.id}`,
      title: cleanSignalTitle(signal),
      context: null,
      meta: `${formatArticleDate(signal.detectedAt)} · ${inferSignalSource(signal)}`,
      ctaLabel: "Rebondir",
      actionKind: "actuality",
      signalId: signal.id,
      signalTitle: signal.title,
    }
  }

  return {
    id: "actuality-empty",
    title: "Aucune actualité exploitable détectée",
    context: null,
    meta: "Veille du compte à jour",
    ctaLabel: "S’informer",
    actionKind: "veille",
    href: "/veille",
  }
}

function commercialContext(value: string | null): string | null {
  const normalized = sentence(value)
  if (!normalized) return null
  const formalize = normalized.match(/^Formaliser (.+)\.$/i)
  if (formalize?.[1]) return sentence(`${formalize[1]} à formaliser`)
  return normalized
}

function selectMissionWindow(missions: ClientIntelligenceMission[], now: Date) {
  return missions
    .filter(isActiveMission)
    .filter((mission) => {
      const distance = daysUntil(mission.endDate, now)
      return distance !== null && distance <= 45
    })
    .toSorted((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""))[0] ?? null
}

export function selectBestOpportunityWindow(data: MobileCockpitSource, now: Date): MobileCockpitFeature {
  const opportunity = openOpportunities(data.opportunities)
    .toSorted((a, b) => {
      const overdueA = (parsed(a.nextActionAt)?.getTime() ?? Infinity) < now.getTime() ? 1 : 0
      const overdueB = (parsed(b.nextActionAt)?.getTime() ?? Infinity) < now.getTime() ? 1 : 0
      return overdueB - overdueA || (b.estimatedGain ?? 0) - (a.estimatedGain ?? 0)
    })[0]
  if (opportunity) {
    return {
      id: `opportunity:${opportunity.id}`,
      title: opportunity.estimatedGain
        ? `${opportunity.title} · ${formatMoney(opportunity.estimatedGain)}`
        : opportunity.title,
      context: commercialContext(opportunity.nextActionLabel),
      meta: null,
      ctaLabel: "Exploiter",
      actionKind: "opportunity",
      href: `/missions/opps/${opportunity.id}/modifier`,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
    }
  }

  const mission = selectMissionWindow(data.missions, now)
  if (mission) {
    const distance = daysUntil(mission.endDate, now) ?? 0
    return {
      id: `mission:${mission.id}`,
      title: distance < 0
        ? `${mission.title} arrivée à échéance`
        : `${mission.title} se termine dans ${distance} jours`,
      context: "Renouvellement non identifié.",
      meta: null,
      ctaLabel: "Relancer",
      actionKind: "opportunity",
      href: "/missions/actives",
      missionId: mission.id,
      missionTitle: mission.title,
    }
  }

  const regulatoryWindow = selectPrimaryCommercialWindow(data.sectorSnapshot?.regulatoryItems ?? [], now)
  if (regulatoryWindow) {
    return {
      id: `regulatory:${regulatoryWindow.id}`,
      title: regulatoryWindow.title ?? regulatoryWindow.name ?? "Fenêtre commerciale sectorielle",
      context: sentence(regulatoryWindow.commercialAngle),
      meta: regulatoryWindow.deadlineDate ? `Échéance ${formatArticleDate(regulatoryWindow.deadlineDate)}` : null,
      ctaLabel: "Exploiter",
      actionKind: "opportunity",
      href: "/prospection/approche-sectorielle",
    }
  }

  const signal = data.accountSignals.find((candidate) => candidate.recommendedAction)
  if (signal) {
    return {
      id: `signal-window:${signal.id}`,
      title: cleanSignalTitle(signal),
      context: sentence(signal.recommendedAction),
      meta: null,
      ctaLabel: "Exploiter",
      actionKind: "actuality",
      signalId: signal.id,
      signalTitle: signal.title,
    }
  }

  return {
    id: "window-empty",
    title: "Aucune fenêtre commerciale qualifiée",
    context: "Le compte reste à surveiller avant de créer une opportunité.",
    meta: null,
    ctaLabel: "Voir le pipe",
    actionKind: "opportunity",
    href: "/missions/opps",
  }
}

function issueContact(issue: ClientIntelligenceIssue, data: MobileCockpitSource) {
  return data.contacts.find((contact) => issue.contactIds.includes(contact.id)) ?? null
}

function issueDevelopmentContext(issue: ClientIntelligenceIssue): string {
  if (/java/i.test(`${issue.title} ${issue.problemStatement}`)) {
    return "Qualifier la reconduction Java."
  }
  return sentence(issue.recommendedNextProbe) ?? sentence(issue.problemStatement) ?? issue.title
}

export function selectDevelopmentAction(data: MobileCockpitSource): MobileCockpitFeature {
  const issue = data.accountIssues
    .toSorted((a, b) => b.importance - a.importance || b.urgency - a.urgency)[0]
  if (issue) {
    const contact = issueContact(issue, data)
    if (contact) {
      return {
        id: `issue:${issue.id}`,
        title: `Recontacter ${titleCaseName(contact.fullName)}`,
        context: issueDevelopmentContext(issue),
        meta: null,
        ctaLabel: "Contacter",
        actionKind: "development",
        contactId: contact.id,
        contactName: contact.fullName,
      }
    }
    return {
      id: `issue:${issue.id}`,
      title: issue.title,
      context: issueDevelopmentContext(issue),
      meta: null,
      ctaLabel: "Qualifier",
      actionKind: "development",
    }
  }

  const opportunity = openOpportunities(data.opportunities).find((candidate) => candidate.nextActionLabel)
  if (opportunity) {
    return {
      id: `development-opportunity:${opportunity.id}`,
      title: sentence(opportunity.nextActionLabel) ?? opportunity.title,
      context: opportunity.title,
      meta: null,
      ctaLabel: "Relancer",
      actionKind: "development",
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
    }
  }

  const signal = data.accountSignals.find((candidate) => candidate.recommendedAction)
  if (signal) {
    return {
      id: `development-signal:${signal.id}`,
      title: sentence(signal.recommendedAction) ?? "Créer un rebond commercial",
      context: cleanSignalTitle(signal),
      meta: null,
      ctaLabel: "Rédiger",
      actionKind: "development",
      signalId: signal.id,
      signalTitle: signal.title,
    }
  }

  if (data.contacts.length === 0) {
    return {
      id: "development-no-contact",
      title: "Identifier un interlocuteur clé",
      context: "Aucun contact qualifié n’est rattaché au compte.",
      meta: null,
      ctaLabel: "Identifier",
      actionKind: "development",
    }
  }

  return {
    id: "development-relationship-gap",
    title: "Élargir la relation vers un sponsor métier",
    context: "Le maillage actuel ne couvre pas ce rôle.",
    meta: null,
    ctaLabel: "Identifier",
    actionKind: "development",
  }
}

export function selectUpcomingMovements(data: MobileCockpitSource, now: Date): MobileCockpitUpcomingItem[] {
  const events = futureEvents(data.commercialTimeline, now).slice(0, 2).map((entry) => ({
    id: `event:${entry.id}`,
    label: compactEventLabel(entry),
    timing: formatCompactEventTiming(entry.occurredAt),
    href: `/agenda?eventId=${calendarEventId(entry)}`,
    overdue: false,
  }))

  const overdueOpportunity = openOpportunities(data.opportunities)
    .filter((opportunity) => (parsed(opportunity.nextActionAt)?.getTime() ?? Infinity) < now.getTime())
    .toSorted((a, b) => (a.nextActionAt ?? "").localeCompare(b.nextActionAt ?? ""))[0]
  if (overdueOpportunity && events.length < 3) {
    events.push({
      id: `opportunity:${overdueOpportunity.id}`,
      label: `Action ${overdueOpportunity.title.replace(/^Renfort équipe\s+/i, "")}`,
      timing: "En retard",
      href: `/missions/opps/${overdueOpportunity.id}/modifier`,
      overdue: true,
    })
  }

  if (events.length < 3) {
    const mission = selectMissionWindow(data.missions, now)
    if (mission) {
      const distance = daysUntil(mission.endDate, now) ?? 0
      events.push({
        id: `mission:${mission.id}`,
        label: `Fin ${mission.title}`,
        timing: distance < 0 ? "Échue" : `Dans ${distance} j`,
        href: "/missions/actives",
        overdue: distance < 0,
      })
    }
  }

  return events.slice(0, 3)
}

function stateLabel(data: MobileCockpitSource): string {
  if (data.missions.some(isActiveMission)) return "Client actif"
  const labels: Record<string, string> = {
    client: "Client",
    client_actif: "Client actif",
    client_dormant: "Client dormant",
    ancien_client: "Ancien client",
    prospect: "Prospect",
    cible: "Prospect à découvrir",
    partenaire: "Partenaire",
  }
  return labels[data.company.lifecycleStatus] ?? data.company.lifecycleStatus
}

export function buildMobileAccountCockpit(
  data: MobileCockpitSource,
  now: Date = new Date(),
): MobileAccountCockpit {
  const activeMissions = data.missions.filter(isActiveMission).length
  const activeOpportunities = openOpportunities(data.opportunities).length
  const nextEvent = futureEvents(data.commercialTimeline, now)[0]
  const summaryParts = [
    `${activeMissions} mission${activeMissions === 1 ? "" : "s"}`,
    `${activeOpportunities} opportunité${activeOpportunities === 1 ? "" : "s"}`,
  ]
  if (nextEvent) {
    summaryParts.push(`${/copil/i.test(nextEvent.title) ? "COPIL" : "RDV"} ${weekday(nextEvent.occurredAt)}`)
  }

  return {
    stateLabel: stateLabel(data),
    accountSummary: summaryParts.join(" · "),
    nowAction: selectNowAction(data, now),
    actuality: selectActualityInsight(data),
    opportunityWindow: selectBestOpportunityWindow(data, now),
    developmentAction: selectDevelopmentAction(data),
    upcoming: selectUpcomingMovements(data, now),
  }
}
