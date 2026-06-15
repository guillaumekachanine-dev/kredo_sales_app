import { createClient } from "@/lib/supabase/server"

export type StaffingStatus = "success" | "warning" | "danger" | "neutral"

export type StaffingKpi = {
  id: string
  label: string
  value: string
  description: string
  detail: string
  status: StaffingStatus
}

export type StaffingStageBucket = {
  key: string
  label: string
  count: number
  share: number
  status: StaffingStatus
}

export type StaffingOriginBucket = {
  key: string
  label: string
  count: number
  share: number
  status: StaffingStatus
}

export type StaffingPositioningDetail = {
  id: string
  stageKey: string
  stageLabel: string
  status: StaffingStatus
  candidateName: string
  clientName: string
  needTitle: string
  startDateLabel: string
  tjmLabel: string
  nextAction: string
}

export type WeeklyStaffingDeadline = {
  id: string
  date: string
  dayLabel: string
  shortDateLabel: string
  type: string
  title: string
  company: string
  priority: string
  status: StaffingStatus
}

export type WeeklyStaffingDay = {
  date: string
  dayLabel: string
  shortDateLabel: string
}

export type StaffingPriority = {
  id: string
  rank: number
  title: string
  company: string
  practice: string
  reason: string
  action: string
  dueLabel: string
  score: number
  status: StaffingStatus
}

export type StaffingNeedSnapshot = {
  id: string
  title: string
  company: string
  stage: string
  priority: string
  candidateCount: number
  startDateLabel: string
  practice: string
  seniority: string
  targetDailyRateLabel: string
  actionLabel: string
  coverageLabel: string
}

export type StaffingDashboardData = {
  asOfLabel: string
  sourceNote: string
  kpis: StaffingKpi[]
  stageDistribution: StaffingStageBucket[]
  positioningDetails: StaffingPositioningDetail[]
  originDistribution: StaffingOriginBucket[]
  weekDays: WeeklyStaffingDay[]
  weeklyDeadlines: WeeklyStaffingDeadline[]
  priorities: StaffingPriority[]
  openNeeds: StaffingNeedSnapshot[]
}

type CompanyRelation = { name: string | null } | { name: string | null }[] | null

type OpportunityRow = {
  id: string
  title: string
  stage: string | null
  priority: string | null
  created_at: string
  updated_at: string
  start_date: string | null
  practice: string | null
  seniority: string | null
  target_daily_rate: number | null
  companies: CompanyRelation
}

type OpportunityCandidateRow = {
  id: string
  opportunity_id: string
  candidate_id: string
  status: string
  created_at: string
  updated_at: string
  proposed_at: string | null
  sent_to_client_at: string | null
  next_action: string | null
}

type CandidateRow = {
  id: string
  source: string | null
  status: string | null
  internal_score: number | null
  expected_daily_rate: number | null
  person: {
    first_name: string | null
    last_name: string | null
    full_name: string | null
  } | {
    first_name: string | null
    last_name: string | null
    full_name: string | null
  }[] | null
}

const CLOSED_OPPORTUNITY_STAGES = new Set(["gagne", "perdu", "abandonne", "non_traitee", "win", "lost"])

const OPPORTUNITY_STAGE_LABELS: Record<string, string> = {
  qualification: "Qualification",
  recherche_profil: "Recherche profils",
  cv_envoyes: "CV envoyés",
  entretien_client: "Entretien client",
  gagne: "Gagné",
  perdu: "Perdu",
  abandonne: "Abandonné",
  non_traitee: "Non traitée",
}

const STAFFING_STATUS_LABELS: Record<string, string> = {
  identifie: "Identifié",
  preselectionne: "Présélectionné",
  propose_interne: "Proposé interne",
  envoye_client: "Envoyé client",
  entretien_planifie: "Entretien planifié",
  entretien_realise: "Entretien réalisé",
  retenu: "Retenu",
  refuse_client: "Refus client",
  refuse_candidat: "Refus candidat",
  abandonne: "Abandonné",
}

const STAFFING_STATUS_ORDER = [
  "identifie",
  "preselectionne",
  "propose_interne",
  "envoye_client",
  "entretien_planifie",
  "entretien_realise",
  "retenu",
  "refuse_client",
  "refuse_candidat",
  "abandonne",
]

const TRANSFORMED_STAFFING_STATUSES = new Set([
  "envoye_client",
  "entretien_planifie",
  "entretien_realise",
  "retenu",
])

const ORIGIN_LABELS: Record<string, string> = {
  recruiting_team: "Équipe recrutement",
  ai_suggestion: "Suggestion IA",
  personal_sourcing: "Sourcing perso",
  referral: "Cooptation",
  other: "Autres",
}

const ORIGIN_STATUS: Record<string, StaffingStatus> = {
  recruiting_team: "success",
  ai_suggestion: "neutral",
  personal_sourcing: "warning",
  referral: "success",
  other: "neutral",
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function normalizeKey(value: string | null | undefined) {
  return (value || "").trim().toLowerCase()
}

function getCompanyName(opportunity: OpportunityRow) {
  return pickOne(opportunity.companies)?.name?.trim() || "Compte non renseigné"
}

function getCandidateName(candidate: CandidateRow | undefined) {
  const person = pickOne(candidate?.person)
  const composed = `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim()
  return person?.full_name?.trim() || composed || "Candidat non renseigné"
}

function getStageLabel(stage: string | null | undefined) {
  const key = normalizeKey(stage)
  return OPPORTUNITY_STAGE_LABELS[key] || STAFFING_STATUS_LABELS[key] || key.replace(/_/g, " ") || "Non renseigné"
}

function getPriorityLabel(priority: string | null | undefined) {
  const key = normalizeKey(priority)
  if (key === "haute" || key === "high") return "Haute"
  if (key === "basse" || key === "low") return "Basse"
  return "Normale"
}

function getPriorityStatus(priority: string | null | undefined): StaffingStatus {
  const key = normalizeKey(priority)
  if (key === "haute" || key === "high") return "danger"
  if (key === "basse" || key === "low") return "neutral"
  return "warning"
}

function getOriginKey(source: string | null | undefined) {
  const key = normalizeKey(source)
  if (["referral", "cooptation", "recommandation"].includes(key)) return "referral"
  if (["portfolio_platform", "ai", "ia", "ai_suggestion", "suggestion_ia"].includes(key)) return "ai_suggestion"
  if (["linkedin", "headhunting", "sourcing", "direct", "approche_directe"].includes(key)) return "personal_sourcing"
  if (["inbound", "jobboard", "school", "school_event", "event", "recrutement"].includes(key)) return "recruiting_team"
  return "other"
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay()
  const offset = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + offset)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isWithinRange(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
}

function daysBetween(start: Date, end: Date) {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

function round(value: number, precision = 0) {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%"
  return `${Math.round(value)}%`
}

function formatDays(value: number | null) {
  if (value === null) return "—"
  return `${round(value, 1).toLocaleString("fr-FR")} j`
}

function formatDateShort(date: Date | null) {
  if (!date) return "—"
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date)
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—"
  return `${Math.round(value).toLocaleString("fr-FR")} €`
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(".", "")
}

function statusToneForStaffingStep(status: string): StaffingStatus {
  const key = normalizeKey(status)
  if (["retenu"].includes(key)) return "success"
  if (["envoye_client", "entretien_planifie", "entretien_realise", "propose_interne"].includes(key)) return "warning"
  if (["refuse_client", "refuse_candidat", "abandonne"].includes(key)) return "danger"
  return "neutral"
}

function getDeadlineType(link: OpportunityCandidateRow) {
  const key = normalizeKey(link.status)
  if (key === "retenu") return "Démarrage"
  if (key === "propose_interne") return "Préparer CV"
  if (key === "preselectionne") return "Présélection"
  if (key === "identifie") return "Qualification"
  if (key.startsWith("entretien")) return "Entretien"
  return "Suivi"
}

function scoreNeed(
  opportunity: OpportunityRow,
  links: OpportunityCandidateRow[],
  now: Date,
) {
  const priority = normalizeKey(opportunity.priority)
  const stage = normalizeKey(opportunity.stage)
  const startDate = toDate(opportunity.start_date)
  const age = daysBetween(toDate(opportunity.created_at) ?? now, now)
  let score = 0

  if (priority === "haute" || priority === "high") score += 40
  else if (priority === "basse" || priority === "low") score += 10
  else score += 22

  if (links.length === 0) score += 35
  if (stage === "recherche_profil") score += 18
  if (stage === "entretien_client") score += 14
  if (stage === "qualification") score += 8
  if (age >= 5) score += 8

  if (startDate) {
    const daysToStart = daysBetween(now, startDate)
    if (daysToStart <= 14) score += 28
    else if (daysToStart <= 30) score += 12
  }

  if (links.some((link) => normalizeKey(link.status) === "retenu")) score += 10
  return score
}

function getPriorityAction(opportunity: OpportunityRow, links: OpportunityCandidateRow[]) {
  if (links.length === 0) return "Positionner des profils"
  if (links.some((link) => normalizeKey(link.status) === "retenu")) return "Sécuriser le démarrage"
  if (links.some((link) => normalizeKey(link.status) === "propose_interne")) return "Envoyer au client"
  if (links.some((link) => ["identifie", "preselectionne"].includes(normalizeKey(link.status)))) return "Accélérer la qualification"
  return "Relancer le suivi"
}

function getPriorityReason(opportunity: OpportunityRow, links: OpportunityCandidateRow[], now: Date) {
  const startDate = toDate(opportunity.start_date)
  if (links.length === 0) return "Aucun candidat positionné sur un besoin ouvert."
  if (startDate) return `Démarrage cible le ${formatDateShort(startDate)} avec ${links.length} profil(s) suivi(s).`
  const oldest = links
    .map((link) => toDate(link.proposed_at) ?? toDate(link.created_at))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0]
  if (oldest) return `${links.length} profil(s) en cours depuis ${daysBetween(oldest, now)} jour(s).`
  return `${links.length} profil(s) positionné(s), prochaine étape à clarifier.`
}

function getPriorityDueLabel(opportunity: OpportunityRow) {
  const startDate = toDate(opportunity.start_date)
  if (startDate) return `Avant le ${formatDateShort(startDate)}`
  if (normalizeKey(opportunity.priority) === "haute") return "Cette semaine"
  return "Sous 7 jours"
}

export async function getStaffingDashboardData(): Promise<StaffingDashboardData> {
  const supabase = await createClient()
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = addDays(weekStart, 6)
  const weekDays: WeeklyStaffingDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    return {
      date: date.toISOString(),
      dayLabel: formatDayLabel(date),
      shortDateLabel: formatDateShort(date),
    }
  })

  const [opportunitiesResult, staffingResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id,title,stage,priority,created_at,updated_at,start_date,practice,seniority,target_daily_rate,companies(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("opportunity_candidates")
      .select("id,opportunity_id,candidate_id,status,created_at,updated_at,proposed_at,sent_to_client_at,next_action")
      .order("created_at", { ascending: false }),
  ])

  if (opportunitiesResult.error) {
    console.error("[staffing-data] Error loading opportunities:", opportunitiesResult.error)
  }
  if (staffingResult.error) {
    console.error("[staffing-data] Error loading opportunity_candidates:", staffingResult.error)
  }

  const opportunities = (opportunitiesResult.data ?? []) as unknown as OpportunityRow[]
  const staffingLinks = (staffingResult.data ?? []) as OpportunityCandidateRow[]
  const candidateIds = [...new Set(staffingLinks.map((link) => link.candidate_id))]

  let candidates: CandidateRow[] = []
  if (candidateIds.length > 0) {
    const { data, error } = await supabase
      .from("candidates")
      .select("id,source,status,internal_score,expected_daily_rate,person:persons(first_name,last_name,full_name)")
      .in("id", candidateIds)

    if (error) {
      console.error("[staffing-data] Error loading candidates:", error)
    } else {
      candidates = (data ?? []) as CandidateRow[]
    }
  }

  const openNeeds = opportunities.filter((opportunity) => !CLOSED_OPPORTUNITY_STAGES.has(normalizeKey(opportunity.stage)))
  const openNeedIds = new Set(openNeeds.map((need) => need.id))
  const linksOnOpenNeeds = staffingLinks.filter((link) => openNeedIds.has(link.opportunity_id))

  const linksByOpportunity = new Map<string, OpportunityCandidateRow[]>()
  for (const link of linksOnOpenNeeds) {
    const current = linksByOpportunity.get(link.opportunity_id) ?? []
    current.push(link)
    linksByOpportunity.set(link.opportunity_id, current)
  }

  const positionedCount = linksOnOpenNeeds.length
  const coveredNeedCount = openNeeds.filter((need) => (linksByOpportunity.get(need.id)?.length ?? 0) > 0).length
  const coverageRate = openNeeds.length > 0 ? (coveredNeedCount / openNeeds.length) * 100 : 0

  const positioningDurations = openNeeds.flatMap((need) => {
    const needDate = toDate(need.created_at)
    const firstLinkDate = (linksByOpportunity.get(need.id) ?? [])
      .map((link) => toDate(link.proposed_at) ?? toDate(link.created_at))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime())[0]

    if (!needDate || !firstLinkDate) return []
    return [daysBetween(needDate, firstLinkDate)]
  })
  const averagePositioningDays = positioningDurations.length
    ? positioningDurations.reduce((sum, value) => sum + value, 0) / positioningDurations.length
    : null

  const transformedCount = linksOnOpenNeeds.filter((link) => TRANSFORMED_STAFFING_STATUSES.has(normalizeKey(link.status))).length
  const transformationRate = positionedCount > 0 ? (transformedCount / positionedCount) * 100 : 0

  const kpis: StaffingKpi[] = [
    {
      id: "open-needs",
      label: "Besoins ouverts",
      value: String(openNeeds.length),
      description: "Opportunités non clôturées",
      detail: `${openNeeds.filter((need) => normalizeKey(need.priority) === "haute").length} haute priorité`,
      status: openNeeds.length > 0 ? "warning" : "success",
    },
    {
      id: "positioned-candidates",
      label: "Candidats positionnés",
      value: String(positionedCount),
      description: "Sur besoins ouverts",
      detail: `${formatPercent(coverageRate)} de couverture`,
      status: coverageRate >= 80 ? "success" : coverageRate >= 50 ? "warning" : "danger",
    },
    {
      id: "average-positioning-time",
      label: "Temps de positionnement",
      value: formatDays(averagePositioningDays),
      description: "Création besoin → premier profil",
      detail: `${positioningDurations.length} besoin(s) mesuré(s)`,
      status: averagePositioningDays === null ? "neutral" : averagePositioningDays <= 3 ? "success" : averagePositioningDays <= 7 ? "warning" : "danger",
    },
    {
      id: "transformation-rate",
      label: "Taux de transformation",
      value: formatPercent(transformationRate),
      description: "Profil envoyé, en entretien ou retenu",
      detail: `${transformedCount}/${positionedCount || 0} positionnement(s)`,
      status: transformationRate >= 35 ? "success" : transformationRate >= 15 ? "warning" : "danger",
    },
  ]

  const stageCounts = new Map<string, number>()
  for (const link of linksOnOpenNeeds) {
    const key = normalizeKey(link.status) || "non_renseigne"
    stageCounts.set(key, (stageCounts.get(key) ?? 0) + 1)
  }
  const stageDistribution = [...stageCounts.entries()]
    .map(([key, count]) => ({
      key,
      label: STAFFING_STATUS_LABELS[key] || getStageLabel(key),
      count,
      share: positionedCount > 0 ? Math.round((count / positionedCount) * 100) : 0,
      status: statusToneForStaffingStep(key),
    }))
    .sort((a, b) => {
      const aIndex = STAFFING_STATUS_ORDER.indexOf(a.key)
      const bIndex = STAFFING_STATUS_ORDER.indexOf(b.key)
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
    })

  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]))
  const opportunityById = new Map(openNeeds.map((opportunity) => [opportunity.id, opportunity]))
  const positioningDetails: StaffingPositioningDetail[] = linksOnOpenNeeds
    .map((link) => {
      const opportunity = opportunityById.get(link.opportunity_id)
      const candidate = candidateById.get(link.candidate_id)
      const stageKey = normalizeKey(link.status) || "non_renseigne"
      const dailyRate = candidate?.expected_daily_rate ?? opportunity?.target_daily_rate ?? null

      return {
        id: link.id,
        stageKey,
        stageLabel: STAFFING_STATUS_LABELS[stageKey] || getStageLabel(stageKey),
        status: statusToneForStaffingStep(stageKey),
        candidateName: getCandidateName(candidate),
        clientName: opportunity ? getCompanyName(opportunity) : "Compte non renseigné",
        needTitle: opportunity?.title || "Besoin non renseigné",
        startDateLabel: formatDateShort(toDate(opportunity?.start_date)),
        tjmLabel: formatCurrency(dailyRate),
        nextAction: link.next_action || getDeadlineType(link),
      }
    })
    .sort((a, b) => a.candidateName.localeCompare(b.candidateName))
  const originCounts = new Map<string, number>()
  for (const link of linksOnOpenNeeds) {
    const candidate = candidateById.get(link.candidate_id)
    const origin = getOriginKey(candidate?.source)
    originCounts.set(origin, (originCounts.get(origin) ?? 0) + 1)
  }
  const originDistribution = [...originCounts.entries()]
    .map(([key, count]) => ({
      key,
      label: ORIGIN_LABELS[key] || key,
      count,
      share: positionedCount > 0 ? Math.round((count / positionedCount) * 100) : 0,
      status: ORIGIN_STATUS[key] ?? "neutral",
    }))
    .sort((a, b) => b.count - a.count)

  const weeklyDeadlines: WeeklyStaffingDeadline[] = []
  for (const link of linksOnOpenNeeds) {
    const date = toDate(link.proposed_at) ?? toDate(link.created_at)
    const opportunity = opportunityById.get(link.opportunity_id)
    if (!date || !opportunity || !isWithinRange(startOfDay(date), weekStart, weekEnd)) continue

    weeklyDeadlines.push({
      id: link.id,
      date: date.toISOString(),
      dayLabel: formatDayLabel(date),
      shortDateLabel: formatDateShort(date),
      type: getDeadlineType(link),
      title: link.next_action || getStageLabel(link.status),
      company: getCompanyName(opportunity),
      priority: getPriorityLabel(opportunity.priority),
      status: getPriorityStatus(opportunity.priority),
    })
  }

  for (const opportunity of openNeeds) {
    const startDate = toDate(opportunity.start_date)
    if (!startDate || !isWithinRange(startOfDay(startDate), weekStart, weekEnd)) continue
    weeklyDeadlines.push({
      id: `${opportunity.id}-start`,
      date: startDate.toISOString(),
      dayLabel: formatDayLabel(startDate),
      shortDateLabel: formatDateShort(startDate),
      type: "Démarrage cible",
      title: opportunity.title,
      company: getCompanyName(opportunity),
      priority: getPriorityLabel(opportunity.priority),
      status: getPriorityStatus(opportunity.priority),
    })
  }

  weeklyDeadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const priorities = openNeeds
    .map((opportunity) => {
      const links = linksByOpportunity.get(opportunity.id) ?? []
      return {
        id: opportunity.id,
        rank: 0,
        title: opportunity.title,
        company: getCompanyName(opportunity),
        practice: opportunity.practice || getStageLabel(opportunity.stage),
        reason: getPriorityReason(opportunity, links, now),
        action: getPriorityAction(opportunity, links),
        dueLabel: getPriorityDueLabel(opportunity),
        score: scoreNeed(opportunity, links, now),
        status: getPriorityStatus(opportunity.priority),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((priority, index) => ({ ...priority, rank: index + 1 }))

  const openNeedSnapshots = openNeeds
    .map((need) => ({
      id: need.id,
      title: need.title,
      company: getCompanyName(need),
      stage: getStageLabel(need.stage),
      priority: getPriorityLabel(need.priority),
      candidateCount: linksByOpportunity.get(need.id)?.length ?? 0,
      startDateLabel: formatDateShort(toDate(need.start_date)),
      practice: need.practice || "Practice non renseignée",
      seniority: need.seniority || "Séniorité non renseignée",
      targetDailyRateLabel: formatCurrency(need.target_daily_rate),
      actionLabel: getPriorityAction(need, linksByOpportunity.get(need.id) ?? []),
      coverageLabel: (linksByOpportunity.get(need.id)?.length ?? 0) > 0
        ? `${linksByOpportunity.get(need.id)?.length ?? 0} profil(s)`
        : "Aucun profil",
    }))
    .sort((a, b) => b.candidateCount - a.candidateCount)

  return {
    asOfLabel: new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now),
    sourceNote: `${opportunities.length} besoin(s), ${staffingLinks.length} positionnement(s), ${candidates.length} candidat(s) liés`,
    kpis,
    stageDistribution,
    positioningDetails,
    originDistribution,
    weekDays,
    weeklyDeadlines,
    priorities,
    openNeeds: openNeedSnapshots,
  }
}
