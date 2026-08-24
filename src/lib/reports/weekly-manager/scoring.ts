import type {
  AgendaDomain,
  AgendaItem,
  AgendaPriority,
  AgendaSourceType,
  AgendaTemporalState,
} from "@/lib/agenda/agenda-types"
import type { WeeklyManagerPriorityItem, WeeklyManagerPriorityTier } from "@/app/(app)/reports/_data/reports-types"

// Scoring déterministe versionné — jamais recalculé par le LLM (même
// doctrine que les anciens agrégats synthétiques de compte,
// CLAUDE.md § Nouveau composant financier). "v1" figé dans chaque
// WeeklyManagerPriorityItem.scoringVersion pour permettre une v2 sans casser
// les briefs déjà générés.
export const WEEKLY_SCORING_VERSION = "weekly-scoring-v1"

// 3 semaines de dismiss consécutives (ADR-0010 §8) déclassent un item en
// "normal" quel que soit son rang — signal d'apprentissage v1, pas de ML.
const DISMISS_DECLASSIFICATION_THRESHOLD = 3

const URGENCY_BY_TEMPORAL_STATE: Record<AgendaTemporalState, number> = {
  overdue: 4,
  today: 3,
  ongoing: 3,
  upcoming: 1,
  past: 0,
}

const IMPACT_BY_DOMAIN: Record<AgendaDomain, number> = {
  commerce: 3,
  missions: 3,
  staffing: 2,
  recruitment: 2,
  consultants: 2,
  agenda: 1,
}

const IMPACT_BY_PRIORITY: Record<AgendaPriority, number> = {
  urgent: 2,
  high: 1,
  normal: 0,
  low: 0,
}

function riskFromItem(item: AgendaItem): number {
  if (item.type !== "alert") return 0

  switch (item.alertKind) {
    case "schedule_conflict":
      return 3
    case "deadline_at_risk":
      return 2
    case "overdue_task":
      return 2
    case "week_tension":
      return 1
  }
}

export type ScoredAgendaItem = {
  item: AgendaItem
  rank: number
  tier: WeeklyManagerPriorityTier
  wasDeclassifiedByDismiss: boolean
}

// rank = urgence×3 + impact×2 + risque×1 (pondération v1, voir ADR-0010 §2.3).
// dismissCount = nombre de semaines consécutives où cet item a été ignoré
// (weekly_brief_dismissals) — passé par l'appelant, cette fonction reste pure.
export function scoreAgendaItem(item: AgendaItem, dismissCount = 0): ScoredAgendaItem {
  const urgency = URGENCY_BY_TEMPORAL_STATE[item.temporalState]
  const impact = IMPACT_BY_DOMAIN[item.domain] + IMPACT_BY_PRIORITY[item.priority]
  const risk = riskFromItem(item)
  const rank = urgency * 3 + impact * 2 + risk

  const rawTier: WeeklyManagerPriorityTier = rank >= 12 ? "critical" : rank >= 7 ? "high" : "normal"
  const wasDeclassifiedByDismiss = dismissCount >= DISMISS_DECLASSIFICATION_THRESHOLD && rawTier !== "normal"
  const tier: WeeklyManagerPriorityTier = wasDeclassifiedByDismiss ? "normal" : rawTier

  return { item, rank, tier, wasDeclassifiedByDismiss }
}

const AGENDA_SOURCE_TO_ENTITY_TYPE: Partial<Record<AgendaSourceType, string>> = {
  mission: "mission",
  opportunity: "opportunity",
  calendar_event: "calendar_event",
  candidate_hiring_milestone: "candidate",
}

function resolveEntityRef(item: AgendaItem): { entityType?: string; entityId?: string } {
  const entityType = AGENDA_SOURCE_TO_ENTITY_TYPE[item.sourceType as AgendaSourceType]
  if (!entityType) return {}
  return { entityType, entityId: item.sourceId }
}

function buildReason(item: AgendaItem): string {
  if (item.type === "alert") {
    switch (item.alertKind) {
      case "schedule_conflict":
        return "Conflit d'agenda détecté avec un autre élément de la semaine."
      case "deadline_at_risk":
        return "Échéance proche jugée à risque au vu de son statut actuel."
      case "overdue_task":
        return "Tâche en retard depuis la date d'échéance prévue."
      case "week_tension":
        return "La semaine est identifiée comme dense (charge ou retards cumulés)."
    }
  }

  if (item.temporalState === "overdue") return "En retard par rapport à sa date prévue."
  if (item.temporalState === "today") return "Échéance ou action prévue aujourd'hui."
  return "Élément prévu cette semaine."
}

function buildRecommendedAction(item: AgendaItem): string {
  switch (item.type) {
    case "task":
      return "Traiter ou reprogrammer la tâche."
    case "deadline":
      switch (item.deadlineKind) {
        case "opportunity_next_action":
          return "Réaliser la prochaine action commerciale prévue."
        case "opportunity_target_close":
          return "Vérifier l'avancement de l'opportunité avant la date de closing cible."
        case "mission_start":
          return "Confirmer le démarrage de la mission."
        case "mission_end":
          return "Anticiper la fin de mission (renouvellement, extension ou fin de contrat)."
        case "recruitment_milestone":
          return "Faire avancer le jalon de recrutement."
      }
      break
    case "alert":
      switch (item.alertKind) {
        case "schedule_conflict":
          return "Arbitrer entre les éléments en conflit."
        case "deadline_at_risk":
          return "Sécuriser l'échéance avant qu'elle ne devienne critique."
        case "overdue_task":
          return "Clôturer ou reprogrammer la tâche en retard."
        case "week_tension":
          return "Répartir la charge sur la semaine ou déléguer certains éléments."
      }
      break
    case "scheduled_event":
      return "Préparer l'événement planifié."
    case "availability_block":
      return "Tenir compte de cette indisponibilité dans la planification."
  }
  return "Vérifier cet élément."
}

export function buildPriorityItem(scored: ScoredAgendaItem, rank: number): WeeklyManagerPriorityItem {
  const { item, tier } = scored
  const entityRef = resolveEntityRef(item)

  return {
    rank,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    title: item.title,
    reason: buildReason(item),
    tier,
    recommendedAction: buildRecommendedAction(item),
    scoringVersion: WEEKLY_SCORING_VERSION,
    ...entityRef,
  }
}
