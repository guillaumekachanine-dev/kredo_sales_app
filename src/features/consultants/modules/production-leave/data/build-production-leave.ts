// ─────────────────────────────────────────────────────────────────────────────
//  Production & Congés — Builder pur du Data Contract (Lot 11)
//
//  Transforme les données brutes Supabase en un view-model mensuel déterministe.
//  Aucune dépendance Supabase ni manipulation DOM.
//  Invariants protégés :
//   - Granularité mensuelle stricte (C-30) ;
//   - Aucun planning journalier de production fictif (C-08) ;
//   - Population active status <> 'sorti' (C-16) ;
//   - Résolution practice canonique (C-17) ;
//   - TACI non double-compté au coût salarial ;
//   - Confidentialité RLS respectée (coûts/marges = null si non autorisé).
// ─────────────────────────────────────────────────────────────────────────────

import {
  getPracticeByName,
  isOfferPracticeSlug,
  PRACTICE_SLUG_TO_OFFER_PRACTICE,
  type OfferPracticeSlug,
} from "@/lib/config/practices"
import type {
  BuildProductionLeaveInput,
  CollaboratorMonthlyProduction,
  MonthlyAbsenceBreakdownItem,
  MonthlyAbsenceItem,
  ProductionLeaveCollaborator,
  ProductionLeaveViewModel,
  RawAbsence,
  RawActiveCollaborator,
  RawActivitySummary,
  RawCompensation,
  RawYtdActivity,
  YtdProductivity,
} from "./production-leave.types"

const SORTI_STATUS = "sorti"

export const ABSENCE_LABELS: Record<string, string> = {
  conge_paye: "Congés payés",
  rtt: "RTT",
  maladie: "Maladie",
  sans_solde: "Sans solde",
  contrainte_perso: "Contrainte personnelle",
  formation: "Formation",
  fermeture_client: "Fermeture client",
  autre: "Autre absence",
}

function round(value: number, decimals: number = 2): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Minuscules sans accents ni ponctuation — pour un rapprochement tolérant de libellés. */
function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Résolution de la Practice conformément à C-17. */
function resolveCollaboratorPractice(
  collaborator: RawActiveCollaborator,
  jobProfilePracticeById: Map<string, string | null>,
  offerPracticeSlugById: Map<string, string>,
  offerPracticeNameById: Map<string, string>,
  offerPracticeSlugByName: Map<string, string>,
): { practiceKey: string | null; practiceLabel: string | null } {
  if (collaborator.job_profile_id) {
    const practiceId = jobProfilePracticeById.get(collaborator.job_profile_id)
    if (practiceId) {
      const slug = offerPracticeSlugById.get(practiceId)
      if (slug && isOfferPracticeSlug(slug)) {
        return {
          practiceKey: slug,
          practiceLabel: offerPracticeNameById.get(practiceId) ?? slug,
        }
      }
    }
  }

  if (collaborator.practice) {
    const exactSlug = offerPracticeSlugByName.get(normalizeLabel(collaborator.practice))
    if (exactSlug && isOfferPracticeSlug(exactSlug)) {
      return {
        practiceKey: exactSlug,
        practiceLabel: collaborator.practice,
      }
    }
  }

  const config = getPracticeByName(collaborator.practice)
  if (config) {
    const offerSlug = PRACTICE_SLUG_TO_OFFER_PRACTICE[config.slug] as OfferPracticeSlug | undefined
    return {
      practiceKey: offerSlug ?? config.slug,
      practiceLabel: config.name,
    }
  }

  return {
    practiceKey: null,
    practiceLabel: collaborator.practice?.trim() || null,
  }
}

/** Compte les jours ouvrés (du lundi au vendredi) entre deux dates ISO incluses. */
function countBusinessDays(startIso: string, endIso: string): number {
  const start = new Date(startIso + "T00:00:00Z")
  const end = new Date(endIso + "T00:00:00Z")
  if (start.getTime() > end.getTime()) return 0

  let count = 0
  const cur = new Date(start)
  while (cur.getTime() <= end.getTime()) {
    const day = cur.getUTCDay()
    if (day !== 0 && day !== 6) {
      count++
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return count
}

/** Renvoie le premier jour d'un mois "YYYY-MM" au format "YYYY-MM-DD". */
function getMonthStart(month: string): string {
  return `${month}-01`
}

/** Renvoie le dernier jour d'un mois "YYYY-MM" au format "YYYY-MM-DD". */
function getMonthEnd(month: string): string {
  const [yearStr, monthStr] = month.split("-")
  const y = Number(yearStr)
  const m = Number(monthStr)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return `${month}-${String(lastDay).padStart(2, "0")}`
}

/** Alloue les jours d'une absence au mois ciblé "YYYY-MM". */
export function allocateAbsenceDaysToMonth(absence: RawAbsence, month: string): number {
  const startMonth = absence.start_date.slice(0, 7)
  const endMonth = absence.end_date.slice(0, 7)

  if (month < startMonth || month > endMonth) {
    return 0
  }

  // Absence contenue intégralement dans ce mois
  if (startMonth === endMonth && startMonth === month) {
    return Number(absence.duration_days)
  }

  // Absence traversant plusieurs mois : ventilation proportionnelle sur les jours ouvrés réels
  const monthStart = getMonthStart(month)
  const monthEnd = getMonthEnd(month)

  const overlapStart = absence.start_date > monthStart ? absence.start_date : monthStart
  const overlapEnd = absence.end_date < monthEnd ? absence.end_date : monthEnd

  const overlapBizDays = countBusinessDays(overlapStart, overlapEnd)
  const totalBizDays = countBusinessDays(absence.start_date, absence.end_date)

  if (totalBizDays <= 0 || overlapBizDays <= 0) {
    return 0
  }

  const duration = Number(absence.duration_days)
  const allocated = duration * (overlapBizDays / totalBizDays)
  return round(allocated, 1)
}

export function buildProductionLeave(
  input: BuildProductionLeaveInput,
): ProductionLeaveViewModel {
  const {
    referenceMonth: rawReferenceMonth,
    collaborators: allCollaborators,
    activitySummaries,
    ytdActivities,
    absences,
    compensations,
    offerPractices = [],
    jobProfiles = [],
    compensationReadable,
  } = input

  // 1. Population active (C-16)
  const activeCollaborators = allCollaborators.filter(
    (c) => c.status !== SORTI_STATUS,
  )

  // 2. Indexation des catalogues pour résolution Practice (C-17)
  const jobProfilePracticeById = new Map<string, string | null>()
  jobProfiles.forEach((jp) => {
    jobProfilePracticeById.set(jp.id, jp.practice_id)
  })

  const offerPracticeSlugById = new Map<string, string>()
  const offerPracticeNameById = new Map<string, string>()
  const offerPracticeSlugByName = new Map<string, string>()
  offerPractices.forEach((op) => {
    offerPracticeSlugById.set(op.id, op.slug)
    offerPracticeNameById.set(op.id, op.name)
    offerPracticeSlugByName.set(normalizeLabel(op.name), op.slug)
  })

  // 3. Identification des mois disponibles (bornés aux 12 derniers mois max)
  const monthSet = new Set<string>()
  activitySummaries.forEach((s) => {
    if (s.period_start) {
      monthSet.add(s.period_start.slice(0, 7))
    }
  })
  absences.forEach((a) => {
    if (a.start_date) monthSet.add(a.start_date.slice(0, 7))
    if (a.end_date) monthSet.add(a.end_date.slice(0, 7))
  })
  if (rawReferenceMonth) {
    monthSet.add(rawReferenceMonth.slice(0, 7))
  }

  // Tri décroissant pour la sélection
  const sortedMonthsDesc = [...monthSet].sort().reverse()
  const availableMonths = sortedMonthsDesc.slice(0, 12)

  // Mois de référence
  const referenceMonth =
    rawReferenceMonth && rawReferenceMonth.length >= 7
      ? rawReferenceMonth.slice(0, 7)
      : availableMonths[0] ?? new Date().toISOString().slice(0, 7)

  // Chronologie croissante pour l'historique collaborateur
  const chronologicalMonths = [...availableMonths].reverse()

  // 4. Indexation des résumés d'activité par [collaborateurId:mois]
  const summaryByCollabMonth = new Map<string, RawActivitySummary>()
  activitySummaries.forEach((s) => {
    const month = s.period_start.slice(0, 7)
    const key = `${s.collaborator_id}:${month}`
    summaryByCollabMonth.set(key, s)
  })

  // 5. Indexation YTD
  const ytdByCollab = new Map<string, RawYtdActivity>()
  ytdActivities.forEach((y) => {
    ytdByCollab.set(y.collaborator_id, y)
  })

  // 6. Indexation des rémunérations
  const compensationByCollab = new Map<string, RawCompensation>()
  compensations.forEach((c) => {
    compensationByCollab.set(c.collaborator_id, c)
  })

  // 7. Indexation des absences par collaborateur
  const absencesByCollab = new Map<string, RawAbsence[]>()
  absences.forEach((a) => {
    const list = absencesByCollab.get(a.collaborator_id) ?? []
    list.push(a)
    absencesByCollab.set(a.collaborator_id, list)
  })

  // 8. Construction des collaborateurs
  const collaborators: ProductionLeaveCollaborator[] = activeCollaborators.map((collab) => {
    const { practiceKey, practiceLabel } = resolveCollaboratorPractice(
      collab,
      jobProfilePracticeById,
      offerPracticeSlugById,
      offerPracticeNameById,
      offerPracticeSlugByName,
    )

    const ytdRow = ytdByCollab.get(collab.id)
    const compRow = compensationByCollab.get(collab.id)
    const collabAbsences = absencesByCollab.get(collab.id) ?? []

    // YTD
    const ytd: YtdProductivity = {
      productivityRate: ytdRow?.ytd_activity_rate ?? null,
      targetRate:
        ytdRow?.taci_target != null ? round(ytdRow.taci_target * 100, 2) : null,
      gapVsTarget: ytdRow?.gap_vs_target ?? null,
    }

    // Coût journalier employeur de structure (base brute sans division TACI)
    let baseDailyCost: number | null = null
    if (
      compensationReadable &&
      compRow?.gross_annual != null &&
      compRow?.working_days_per_year
    ) {
      const gross = Number(compRow.gross_annual)
      const variable = Number(compRow.variable_pay ?? 0)
      const charges = Number(compRow.charges_rate ?? 0.45)
      const workingDays = Number(compRow.working_days_per_year ?? 218)
      if (workingDays > 0) {
        baseDailyCost = ((gross + variable) * (1 + charges)) / workingDays
      }
    }

    // Taux cible du collaborateur (TACI en %)
    const collabTargetRate: number | null =
      compRow?.taci != null
        ? round(Number(compRow.taci) * 100, 2)
        : ytdRow?.taci_target != null
          ? round(Number(ytdRow.taci_target) * 100, 2)
          : null

    // Historique mensuel
    const history: CollaboratorMonthlyProduction[] = chronologicalMonths.map((month) => {
      const summary = summaryByCollabMonth.get(`${collab.id}:${month}`)

      const businessDays = summary?.business_days != null ? Number(summary.business_days) : 0
      const productionDays = summary?.billable_days != null ? Number(summary.billable_days) : 0
      const nonBillableDays = summary?.non_billable_days != null ? Number(summary.non_billable_days) : 0
      const ptoDays = summary?.pto_days != null ? Number(summary.pto_days) : 0
      const sickDays = summary?.sick_days != null ? Number(summary.sick_days) : 0

      // Ventilation des absences pour ce mois
      const monthAbsences: MonthlyAbsenceItem[] = []
      const breakdownMap = new Map<string, number>()

      collabAbsences.forEach((a) => {
        const allocatedDays = allocateAbsenceDaysToMonth(a, month)
        if (allocatedDays > 0) {
          monthAbsences.push({
            id: a.id,
            type: a.absence_type,
            startDate: a.start_date,
            endDate: a.end_date,
            durationDays: allocatedDays,
          })
          const cur = breakdownMap.get(a.absence_type) ?? 0
          breakdownMap.set(a.absence_type, cur + allocatedDays)
        }
      })

      // Autres absences (hors CP/RTT et maladie)
      let otherAbsenceDays = 0
      breakdownMap.forEach((days, type) => {
        if (type !== "conge_paye" && type !== "rtt" && type !== "maladie") {
          otherAbsenceDays += days
        }
      })
      otherAbsenceDays = round(otherAbsenceDays, 1)

      // Productivité
      const productivityRate =
        businessDays > 0 ? round((productionDays / businessDays) * 100, 2) : null
      const targetRate = collabTargetRate
      const gapVsTarget =
        productivityRate !== null && targetRate !== null
          ? round(productivityRate - targetRate, 2)
          : null

      // Finances
      const tjm = summary?.tjm_snapshot != null ? Number(summary.tjm_snapshot) : 0
      const hasTjm = tjm > 0

      const revenue = hasTjm ? round(productionDays * tjm, 2) : null
      const targetRevenue =
        hasTjm && targetRate !== null && businessDays > 0
          ? round(businessDays * (targetRate / 100) * tjm, 2)
          : null
      const revenueGap =
        revenue !== null && targetRevenue !== null
          ? round(revenue - targetRevenue, 2)
          : null

      // Coût structurel mensuel de la période (businessDays * baseDailyCost)
      const structuralCost =
        baseDailyCost !== null && businessDays > 0
          ? round(baseDailyCost * businessDays, 2)
          : null

      const margin =
        revenue !== null && structuralCost !== null
          ? round(revenue - structuralCost, 2)
          : null
      const targetMargin =
        targetRevenue !== null && structuralCost !== null
          ? round(targetRevenue - structuralCost, 2)
          : null
      const marginGap =
        margin !== null && targetMargin !== null
          ? round(margin - targetMargin, 2)
          : null

      // Breakdown des absences avec étiquettes et manque à produire théorique
      const absenceBreakdown: MonthlyAbsenceBreakdownItem[] = []
      breakdownMap.forEach((days, type) => {
        const label = ABSENCE_LABELS[type] ?? "Autre absence"
        const estimatedRevenueImpact = hasTjm ? round(days * tjm, 2) : null
        absenceBreakdown.push({
          type,
          label,
          days: round(days, 1),
          estimatedRevenueImpact,
        })
      })

      const hasActivityData = Boolean(summary)

      return {
        month,
        hasActivityData,
        businessDays,
        productionDays,
        nonBillableDays,
        ptoDays,
        sickDays,
        otherAbsenceDays,
        productivityRate,
        targetRate,
        gapVsTarget,
        revenue,
        targetRevenue,
        revenueGap,
        structuralCost,
        margin,
        targetMargin,
        marginGap,
        absenceBreakdown,
        absences: monthAbsences,
      }
    })

    // Mois courant correspondant à referenceMonth
    const currentMonth =
      history.find((h) => h.month === referenceMonth) ?? null

    // Si pas de CRA dans referenceMonth pour ce collaborateur, currentMonth est null
    const hasCraInReferenceMonth = summaryByCollabMonth.has(
      `${collab.id}:${referenceMonth}`,
    )
    const effectiveCurrentMonth = hasCraInReferenceMonth ? currentMonth : null

    return {
      collaboratorId: collab.id,
      personId: collab.person_id,
      fullName: collab.full_name,
      currentTitle: collab.current_title,
      practiceKey,
      practiceLabel,
      currentMonth: effectiveCurrentMonth,
      ytd,
      history,
    }
  })

  // 9. Notes méthodologiques
  const dataNotes: string[] = [
    "L'impact sur le CA par type d'absence représente un manque à produire théorique, et non un coût comptable d'absence.",
  ]

  if (!compensationReadable) {
    dataNotes.unshift(
      "Données de rémunération et marges confidentielles (accès administrateur requis).",
    )
  }

  return {
    referenceMonth,
    availableMonths,
    collaborators,
    dataNotes,
  }
}
