// ─────────────────────────────────────────────────────────────────────────────
//  CONTRAT CANONIQUE DE RENTABILITÉ MISSION — SHELL-0018 Lot 7.3A
//
//  Source de vérité métier UNIQUE, partagée Finance ↔ Engagements. Les loaders
//  `server-only` (getFinanceDashboardData, getEngagementsActivityAnalytics)
//  mappent leurs lignes Supabase vers les formes neutres ci-dessous puis
//  appellent `buildMissionProfitability()`. Aucune dépendance React, aucun accès
//  Supabase : ce module est pur et testable en isolation.
//
//  ── Deux vérités distinctes, JAMAIS fusionnées silencieusement ──────────────
//   • THÉORIQUE / CONTRACTUELLE
//       `missions.gross_margin_pct` (colonne GENERATED = round((tjm-cjm)/tjm*100, 2)),
//       fallback `(TJM − CJM) / TJM` quand `gross_margin_pct` est null (TJM = 0).
//   • RÉELLE CONSTATÉE
//       snapshots CRA uniquement : `billable_days × tjm_snapshot` /
//       `billable_days × cjm_snapshot`. JAMAIS de fallback vers le TJM/CJM
//       contractuel courant — l'absence de CRA facturable ⇒ marge réelle
//       INDISPONIBLE, pas une marge inventée.
//
//  ── Risque TACI (docs/FEATURES/financial_modelisation/financial-modeling-contract.md) ─
//   Ce module ne réapplique JAMAIS un taux d'activité. Le CJM snapshot est un
//   coût journalier déjà déterminé au moment du CRA ; on le multiplie par des
//   jours facturables observés, sans seconde pondération. Pas de double comptage.
//
//  ── Période ────────────────────────────────────────────────────────────────
//   Contrat explicite via `MissionProfitabilityOptions` :
//     • "civil-year" (défaut) — CRA dont `period_start` tombe dans `referenceYear`
//       (défaut : année civile courante). C'est la sémantique des colonnes
//       « CA YTD » / « MCO YTD » de Finance et de la vue Engagements.
//     • "lifetime" — tous les CRA fournis, sans filtre d'année.
//   `referenceYear` est toujours explicite dans le résultat : aucune divergence
//   de période ne peut se cacher derrière un `marginPct` nu.
// ─────────────────────────────────────────────────────────────────────────────

export type MissionProfitabilityPeriod = "civil-year" | "lifetime"

/** Mission telle qu'attendue par le contrat — forme neutre, mappée par le loader. */
export interface MissionProfitabilityMissionInput {
  id: string
  /** `missions.tjm` — NOT NULL en base. */
  tjm: number
  /** `missions.cjm` — NOT NULL en base. */
  cjm: number
  /** `missions.gross_margin_pct` (GENERATED). null uniquement si TJM = 0. */
  grossMarginPct: number | null
}

/** CRA tel qu'attendu par le contrat — forme neutre, mappée par le loader. */
export interface MissionProfitabilityReportInput {
  missionId: string
  /** `period_start` `YYYY-MM-DD` — sert au filtrage de période. */
  periodStart: string
  /** `mission_activity_reports.billable_days` — NOT NULL. */
  billableDays: number
  /** `mission_activity_reports.tjm_snapshot` — NOT NULL. */
  tjmSnapshot: number
  /** `mission_activity_reports.cjm_snapshot` — NOT NULL. */
  cjmSnapshot: number
}

export interface MissionProfitabilityOptions {
  /** Défaut : "civil-year". */
  period?: MissionProfitabilityPeriod
  /** Défaut : `new Date().getFullYear()`. Ignoré si `period === "lifetime"`. */
  referenceYear?: number
}

export interface MissionProfitabilityReal {
  /** true dès qu'un CA réel > 0 a pu être constaté sur la période retenue. */
  available: boolean
  /** Somme des `billable_days` des CRA retenus. */
  billableDays: number
  /** Σ `billable_days × tjm_snapshot`. */
  revenue: number
  /** Σ `billable_days × cjm_snapshot`. */
  cost: number
  /** `revenue − cost` (peut être négatif). */
  marginValue: number
  /** `(marginValue / revenue) × 100`, arrondi 2 décimales. null si `available === false`. */
  marginPct: number | null
}

export interface MissionProfitabilityTheoretical {
  /** Marge contractuelle en %. null si TJM = 0 et `grossMarginPct` absent. */
  marginPct: number | null
  source: "gross_margin_pct" | "tjm_cjm" | "unavailable"
}

export interface MissionProfitabilityResult {
  missionId: string
  period: MissionProfitabilityPeriod
  referenceYear: number
  real: MissionProfitabilityReal
  theoretical: MissionProfitabilityTheoretical
  /**
   * `real.marginPct ?? theoretical.marginPct` — la « marge affichable » quand un
   * lecteur veut UNE valeur : le réel dès qu'il existe, sinon le théorique.
   * null si les deux manquent. C'est le SEUL endroit où ce repli est défini.
   */
  effectiveMarginPct: number | null
}

export interface MissionProfitabilityPortfolio {
  missionCount: number
  missionsWithRealMargin: number
  totalRealRevenue: number
  totalRealCost: number
  totalRealMarginValue: number
  /**
   * Marge réelle pondérée EN VALEUR : `ΣmarginValue / Σrevenue`. Jamais une
   * moyenne naïve des pourcentages (cf. SHELL-0018 Lot 7.3A §17). null si aucun
   * CA réel.
   */
  weightedRealMarginPct: number | null
  /**
   * Marge théorique pondérée par le CA réel des mêmes missions (celles qui ont
   * un CA réel ET une marge théorique). Comparable terme à terme au réel
   * pondéré. null si aucune base.
   */
  weightedTheoreticalMarginPct: number | null
  /** `weightedRealMarginPct − weightedTheoreticalMarginPct`. null si l'un manque. */
  weightedGapPoints: number | null
}

/** Arrondi monétaire/pourcentage canonique : 2 décimales, sans arrondi intermédiaire. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Marge THÉORIQUE d'une mission. `gross_margin_pct` (généré) prioritaire, sinon
 * `(TJM − CJM) / TJM`. Formule unique — `computeTheoreticalMarginPct`
 * (mission-detail-utils) délègue ici.
 */
export function theoreticalMarginPct(
  mission: Pick<MissionProfitabilityMissionInput, "tjm" | "cjm" | "grossMarginPct">,
): MissionProfitabilityTheoretical {
  if (mission.grossMarginPct !== null && Number.isFinite(mission.grossMarginPct)) {
    return { marginPct: mission.grossMarginPct, source: "gross_margin_pct" }
  }
  if (mission.tjm > 0) {
    return {
      marginPct: round2(((mission.tjm - mission.cjm) / mission.tjm) * 100),
      source: "tjm_cjm",
    }
  }
  return { marginPct: null, source: "unavailable" }
}

/** CA réel constaté : Σ `billableDays × tjmSnapshot`. Formule unique. */
export function realRevenue(
  reports: ReadonlyArray<Pick<MissionProfitabilityReportInput, "billableDays" | "tjmSnapshot">>,
): number {
  return reports.reduce((sum, report) => sum + report.billableDays * report.tjmSnapshot, 0)
}

/** Coût réel constaté : Σ `billableDays × cjmSnapshot`. Formule unique. */
export function realCost(
  reports: ReadonlyArray<Pick<MissionProfitabilityReportInput, "billableDays" | "cjmSnapshot">>,
): number {
  return reports.reduce((sum, report) => sum + report.billableDays * report.cjmSnapshot, 0)
}

/**
 * Marge RÉELLE en % sur les snapshots CRA fournis. null si le CA réel est nul ou
 * négatif (marge réelle indisponible — on n'invente rien). Formule unique —
 * `computeRealMarginPct` (mission-detail-utils) délègue ici.
 */
export function realMarginPct(
  reports: ReadonlyArray<
    Pick<MissionProfitabilityReportInput, "billableDays" | "tjmSnapshot" | "cjmSnapshot">
  >,
): number | null {
  const revenue = realRevenue(reports)
  if (revenue <= 0) return null
  return round2(((revenue - realCost(reports)) / revenue) * 100)
}

/**
 * Contrat canonique : une ligne de rentabilité par mission fournie, sur la
 * période retenue. Les missions sans CRA sur la période restent présentes avec
 * `real.available === false`.
 */
export function buildMissionProfitability(
  missions: ReadonlyArray<MissionProfitabilityMissionInput>,
  reports: ReadonlyArray<MissionProfitabilityReportInput>,
  options: MissionProfitabilityOptions = {},
): MissionProfitabilityResult[] {
  const period = options.period ?? "civil-year"
  const referenceYear = options.referenceYear ?? new Date().getFullYear()
  const yearPrefix = String(referenceYear)

  const reportsByMission = new Map<string, MissionProfitabilityReportInput[]>()
  for (const report of reports) {
    if (period === "civil-year" && report.periodStart.slice(0, 4) !== yearPrefix) continue
    const bucket = reportsByMission.get(report.missionId)
    if (bucket) bucket.push(report)
    else reportsByMission.set(report.missionId, [report])
  }

  return missions.map((mission) => {
    const missionReports = reportsByMission.get(mission.id) ?? []
    const revenue = realRevenue(missionReports)
    const cost = realCost(missionReports)
    const billableDays = missionReports.reduce((sum, report) => sum + report.billableDays, 0)
    const available = revenue > 0

    const real: MissionProfitabilityReal = {
      available,
      billableDays,
      revenue,
      cost,
      marginValue: revenue - cost,
      marginPct: available ? round2(((revenue - cost) / revenue) * 100) : null,
    }
    const theoretical = theoreticalMarginPct(mission)

    return {
      missionId: mission.id,
      period,
      referenceYear,
      real,
      theoretical,
      effectiveMarginPct: real.marginPct ?? theoretical.marginPct,
    }
  })
}

/**
 * Agrégat portefeuille pondéré EN VALEUR. À alimenter avec le sous-ensemble de
 * résultats que le lecteur veut agréger (le contrat ne présume pas de filtre).
 */
export function summarizeMissionProfitability(
  results: ReadonlyArray<MissionProfitabilityResult>,
): MissionProfitabilityPortfolio {
  const withReal = results.filter((result) => result.real.available)

  const totalRealRevenue = withReal.reduce((sum, result) => sum + result.real.revenue, 0)
  const totalRealCost = withReal.reduce((sum, result) => sum + result.real.cost, 0)
  const totalRealMarginValue = totalRealRevenue - totalRealCost
  const weightedRealMarginPct =
    totalRealRevenue > 0 ? round2((totalRealMarginValue / totalRealRevenue) * 100) : null

  const theoBase = withReal.filter((result) => result.theoretical.marginPct !== null)
  const theoWeight = theoBase.reduce((sum, result) => sum + result.real.revenue, 0)
  const weightedTheoreticalMarginPct =
    theoWeight > 0
      ? round2(
          theoBase.reduce(
            (sum, result) => sum + (result.theoretical.marginPct as number) * result.real.revenue,
            0,
          ) / theoWeight,
        )
      : null

  const weightedGapPoints =
    weightedRealMarginPct !== null && weightedTheoreticalMarginPct !== null
      ? round2(weightedRealMarginPct - weightedTheoreticalMarginPct)
      : null

  return {
    missionCount: results.length,
    missionsWithRealMargin: withReal.length,
    totalRealRevenue,
    totalRealCost,
    totalRealMarginValue,
    weightedRealMarginPct,
    weightedTheoreticalMarginPct,
    weightedGapPoints,
  }
}
