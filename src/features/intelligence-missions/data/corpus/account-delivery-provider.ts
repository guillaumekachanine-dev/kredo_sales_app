import "server-only"

/**
 * Provider de corpus `account_delivery` — ADR-0020 §5.1 et handoff L7.4.
 *
 * Hydrate les données opérationnelles et financières d'exécution des missions d'un
 * compte client sur une fenêtre glissante de 6 mois calendaires dérivée côté serveur.
 *
 * ── POURQUOI CETTE PROFONDEUR ───────────────────────────────────────────────────
 * Une vue instantanée ne permet pas de dégager la dynamique de livraison : les 6 mois
 * glissants permettent de suivre l'évolution des CRA, les dérives de marge et le CA
 * trimestriel rattachés à ce client spécifique.
 *
 * ── MODE D'EXÉCUTION : `user_rls` ET CONFIDENTIALITÉ ─────────────────────────────
 * Les 4 sources interrogées sont accessibles en `user_rls` (`security_invoker = true`).
 * Le `.eq("workspace_id", ctx.workspaceId)` est systématiquement posé sur chaque
 * relation portant la colonne workspace_id comme seconde serrure.
 *
 * 🔴 RÈGLE DE CONFIDENTIALITÉ NON NÉGOCIABLE :
 * `gross_annual`, `charges_rate`, `working_days_per_year` n'entrent JAMAIS dans la clause
 * `.select(...)` ni dans `content`. Le livrable atterrit dans `intelligence_documents`,
 * à RLS workspace standard lisible par un `viewer` — pas la RLS confidentielle
 * `is_workspace_admin()` de `collaborator_compensation`.
 *
 * ── POINT DE VIGILANCE N°2b : FILTRAGE DES ALERTES DE RENTABILITÉ ────────────────
 * `v_profitability_alerts` n'a ni `company_id` ni `mission_id`. Un collaborateur peut
 * travailler sur plusieurs missions/comptes dans le temps. Pour éviter toute fuite
 * d'alertes d'un autre compte, le filtrage s'opère en deux temps :
 *   1. Résolution des CRA des missions de CE compte (`mission_activity_reports`
 *      filtrée par `.in("mission_id", missionIds)`) pour construire l'ensemble des
 *      paires `${collaborator_id}:${period_start}` légitimes.
 *   2. Ne retenir dans `v_profitability_alerts` (récupérée par collaborateur) que les
 *      lignes dont la paire appartient à cet ensemble.
 */

import type {
  CorpusExclusion,
  CorpusItem,
  CorpusProvider,
  CorpusProviderResult,
  CorpusResolveContext,
} from "../../domain/mission-contracts"

/** Priorité de conservation — ancre chiffrée de la rentabilité compte. */
export const ACCOUNT_DELIVERY_WEIGHT = 92

/** Bornes dures de requête : gardes de volume, pas des règles métier. */
export const MISSIONS_QUERY_LIMIT = 50
export const CRA_QUERY_LIMIT = 200
export const QUARTERLY_REVENUE_QUERY_LIMIT = 100
export const PROFITABILITY_ALERTS_QUERY_LIMIT = 200

/**
 * Dérive la fenêtre d'hydratation de 6 mois calendaires glissants :
 * le mois courant + les 5 mois calendaires qui le précèdent.
 */
export function deriveAccountDeliveryWindow(reference: Date = new Date()): {
  windowStart: string
  windowEnd: string
} {
  const year = reference.getUTCFullYear()
  const month = reference.getUTCMonth() + 1 // 1-12
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const windowEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

  let startYear = year
  let startMonth = month - 5
  while (startMonth <= 0) {
    startMonth += 12
    startYear -= 1
  }
  const windowStart = `${startYear}-${String(startMonth).padStart(2, "0")}-01`
  return { windowStart, windowEnd }
}

/**
 * Calcule la date de début du trimestre civil contenant la date donnée.
 */
export function getQuarterStart(dateStr: string): string {
  const [yStr, mStr] = dateStr.split("-")
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10)
  const qMonth = Math.floor((month - 1) / 3) * 3 + 1
  return `${year}-${String(qMonth).padStart(2, "0")}-01`
}

export function formatMonth(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  const iso = dateStr.length === 7 ? `${dateStr}-01` : dateStr
  const date = new Date(`${iso}T00:00:00Z`)
  if (isNaN(date.getTime())) return dateStr
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date)
}

export function formatCurrency(val: number | null | undefined): string | null {
  if (val === null || val === undefined || isNaN(val)) return null
  const rounded = Math.round(val * 100) / 100
  const isInteger = Number.isInteger(rounded)
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(rounded)
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
  return `${formatted} €`
}

export function formatPercent(val: number | null | undefined): string | null {
  if (val === null || val === undefined || isNaN(val)) return null
  const rounded = Math.round(val * 100) / 100
  const isInteger = Number.isInteger(rounded)
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(rounded)
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
  return `${formatted} %`
}

function line(label: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? `${label} : ${text}` : null
}

function compose(parts: Array<string | null>): string {
  return parts.filter((part): part is string => part !== null).join("\n")
}

function capExclusion(
  table: string,
  label: string,
  limit: number,
): CorpusExclusion {
  return {
    ref: { kind: "account_delivery", table, id: "__query_limit__" },
    title: `${label} : borne de requête atteinte (${limit})`,
    provenance: table,
    reason: "provider_limit",
  }
}

function getAlertLabels(row: {
  alert_negative_margin: boolean | null
  alert_low_margin: boolean | null
  alert_low_activity: boolean | null
  alert_high_sick_days: boolean | null
  alert_cra_not_validated: boolean | null
}): string[] {
  const alerts: string[] = []
  if (row.alert_negative_margin) alerts.push("Marge négative")
  if (row.alert_low_margin) alerts.push("Marge faible (< 15 %)")
  if (row.alert_low_activity) alerts.push("Activité basse (< 70 %)")
  if (row.alert_high_sick_days) alerts.push("Arrêt maladie élevé (> 5 j)")
  if (row.alert_cra_not_validated) alerts.push("CRA non validé")
  return alerts
}

export const accountDeliveryProvider: CorpusProvider<{
  kind: "account_delivery"
  companyId: string
}> = {
  kind: "account_delivery",
  execution: "user_rls",
  weight: ACCOUNT_DELIVERY_WEIGHT,

  async resolve(ctx: CorpusResolveContext, selector): Promise<CorpusProviderResult> {
    const items: CorpusItem[] = []
    const exclusions: CorpusExclusion[] = []

    const { windowStart, windowEnd } = deriveAccountDeliveryWindow()
    const firstQuarterStart = getQuarterStart(windowStart)
    const lastQuarterStart = getQuarterStart(windowEnd)

    // ── 1. MISSIONS & CA TRIMESTRIEL ─────────────────────────────────────────
    const [missionsResult, quarterlyResult] = await Promise.all([
      ctx.supabase
        .from("missions")
        .select(
          "id, title, status, tjm, cjm, gross_margin_pct, practice, start_date, end_date",
        )
        .eq("workspace_id", ctx.workspaceId)
        .eq("company_id", selector.companyId)
        .order("start_date", { ascending: true })
        .limit(MISSIONS_QUERY_LIMIT),

      ctx.supabase
        .from("v_mission_quarterly_revenue")
        .select(
          "mission_id, mission_title, mission_status, company_id, company_name, consultant_name, practice, quarter_label, quarter_start, revenue, cost, gross_margin, gross_margin_pct, billable_days, role_title, seniority",
        )
        .eq("workspace_id", ctx.workspaceId)
        .eq("company_id", selector.companyId)
        .gte("quarter_start", firstQuarterStart)
        .lte("quarter_start", lastQuarterStart)
        .order("quarter_start", { ascending: true })
        .limit(QUARTERLY_REVENUE_QUERY_LIMIT),
    ])

    if (missionsResult.error) {
      throw new Error(`Lecture des missions du compte impossible : ${missionsResult.error.message}`)
    }
    if (quarterlyResult.error) {
      throw new Error(`Lecture du CA trimestriel par mission impossible : ${quarterlyResult.error.message}`)
    }

    const missions = missionsResult.data ?? []
    if (missions.length === MISSIONS_QUERY_LIMIT) {
      exclusions.push(capExclusion("missions", "Missions du compte", MISSIONS_QUERY_LIMIT))
    }

    const quarterlyRows = quarterlyResult.data ?? []
    if (quarterlyRows.length === QUARTERLY_REVENUE_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("v_mission_quarterly_revenue", "CA trimestriel par mission", QUARTERLY_REVENUE_QUERY_LIMIT),
      )
    }

    // ── 2. CRA DES MISSIONS & ALERTES DE RENTABILITÉ SCOPÉES ─────────────────
    const missionIds = missions.map((m) => m.id).filter((id): id is string => Boolean(id))
    const missionTitleById = new Map<string, string>()
    for (const mission of missions) {
      if (mission.id && mission.title) {
        missionTitleById.set(mission.id, mission.title)
      }
    }

    let craRows: Array<{
      id: string
      mission_id: string
      collaborator_id: string
      period_start: string
      period_end: string
      billable_days: number
      business_days: number
      non_billable_days: number
      pto_days: number
      sick_days: number
      activity_rate_percent: number | null
      tjm_snapshot: number
      cjm_snapshot: number
      status: string
    }> = []

    let scopedAlertRows: Array<{
      collaborator_id: string | null
      full_name: string | null
      period_start: string | null
      cra_status: string | null
      activity_rate_percent: number | null
      real_margin_pct: number | null
      alert_low_activity: boolean | null
      alert_low_margin: boolean | null
      alert_negative_margin: boolean | null
      alert_high_sick_days: boolean | null
      alert_cra_not_validated: boolean | null
    }> = []

    if (missionIds.length > 0) {
      const craResult = await ctx.supabase
        .from("mission_activity_reports")
        .select(
          "id, mission_id, collaborator_id, period_start, period_end, billable_days, business_days, non_billable_days, pto_days, sick_days, activity_rate_percent, tjm_snapshot, cjm_snapshot, status",
        )
        .eq("workspace_id", ctx.workspaceId)
        .in("mission_id", missionIds)
        .gte("period_start", windowStart)
        .lte("period_end", windowEnd)
        .order("period_start", { ascending: true })
        .limit(CRA_QUERY_LIMIT)

      if (craResult.error) {
        throw new Error(`Lecture des CRA des missions impossible : ${craResult.error.message}`)
      }

      craRows = (craResult.data ?? []) as typeof craRows
      if (craRows.length === CRA_QUERY_LIMIT) {
        exclusions.push(capExclusion("mission_activity_reports", "CRA des missions", CRA_QUERY_LIMIT))
      }

      // Point de vigilance 2b : ensemble des paires légitimes pour CE compte
      const collaboratorIds = Array.from(
        new Set(craRows.map((r) => r.collaborator_id).filter((id): id is string => Boolean(id))),
      )
      const validCollabPeriodPairs = new Set(
        craRows.map((r) => `${r.collaborator_id}:${r.period_start}`),
      )

      if (collaboratorIds.length > 0) {
        const alertsResult = await ctx.supabase
          .from("v_profitability_alerts")
          .select(
            "collaborator_id, full_name, period_start, cra_status, activity_rate_percent, real_margin_pct, alert_low_activity, alert_low_margin, alert_negative_margin, alert_high_sick_days, alert_cra_not_validated",
          )
          .in("collaborator_id", collaboratorIds)
          .gte("period_start", windowStart)
          .lte("period_start", windowEnd)
          .order("period_start", { ascending: true })
          .limit(PROFITABILITY_ALERTS_QUERY_LIMIT)

        if (alertsResult.error) {
          throw new Error(`Lecture des alertes de rentabilité impossible : ${alertsResult.error.message}`)
        }

        const alertRows = alertsResult.data ?? []
        if (alertRows.length === PROFITABILITY_ALERTS_QUERY_LIMIT) {
          exclusions.push(
            capExclusion("v_profitability_alerts", "Alertes de rentabilité", PROFITABILITY_ALERTS_QUERY_LIMIT),
          )
        }

        // Filtrage strict : ne retenir que les alertes de collaborateurs sur la période rattachée à CE compte
        scopedAlertRows = alertRows.filter(
          (row) =>
            row.collaborator_id &&
            row.period_start &&
            validCollabPeriodPairs.has(`${row.collaborator_id}:${row.period_start}`),
        )
      }
    }

    // ── 3. CONSTRUCTION DES CORPUS ITEMS ─────────────────────────────────────

    // Missions
    for (const mission of missions) {
      if (!mission.id) continue
      const content = compose([
        line("Titre", mission.title),
        line("Statut", mission.status),
        line("Practice", mission.practice),
        line("TJM", formatCurrency(mission.tjm)),
        line("CJM", formatCurrency(mission.cjm)),
        line("Marge brute (%)", formatPercent(mission.gross_margin_pct)),
        line("Date de début", mission.start_date),
        line("Date de fin", mission.end_date ?? "En cours"),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "account_delivery", table: "missions", id: mission.id },
        title: `Mission · ${mission.title}`,
        date: mission.start_date,
        provenance: "missions",
        content,
        chars: content.length,
      })
    }

    // CRA des missions
    for (const cra of craRows) {
      if (!cra.id) continue
      const missionTitle = missionTitleById.get(cra.mission_id) ?? "Mission"
      const content = compose([
        line("Mission", missionTitle),
        line("Période", formatMonth(cra.period_start)),
        line("Jours ouvrés", cra.business_days),
        line("Jours facturables", cra.billable_days),
        line("Jours non facturables", cra.non_billable_days),
        line("Congés payés (jours)", cra.pto_days),
        line("Arrêt maladie (jours)", cra.sick_days),
        line("Taux d'activité", formatPercent(cra.activity_rate_percent)),
        line("TJM snapshot", formatCurrency(cra.tjm_snapshot)),
        line("CJM snapshot", formatCurrency(cra.cjm_snapshot)),
        line("Statut CRA", cra.status),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "account_delivery", table: "mission_activity_reports", id: cra.id },
        title: `CRA · ${missionTitle} · ${formatMonth(cra.period_start)}`,
        date: cra.period_start,
        provenance: "mission_activity_reports",
        content,
        chars: content.length,
      })
    }

    // Alertes de rentabilité scopées
    for (const row of scopedAlertRows) {
      if (!row.collaborator_id || !row.period_start) continue
      const alerts = getAlertLabels(row)
      if (alerts.length === 0) continue

      const content = compose([
        line("Collaborateur", row.full_name),
        line("Période", formatMonth(row.period_start)),
        line("Alertes actives", alerts.join(", ")),
        line("Marge réelle (%)", formatPercent(row.real_margin_pct)),
        line("Taux d'activité", formatPercent(row.activity_rate_percent)),
        line("Statut CRA", row.cra_status),
      ])

      if (!content) continue

      items.push({
        ref: {
          kind: "account_delivery",
          table: "v_profitability_alerts",
          id: `${row.collaborator_id}:${row.period_start}:alerts`,
        },
        title: `Alertes rentabilité · ${row.full_name ?? "Collaborateur"} · ${formatMonth(row.period_start)}`,
        date: row.period_start,
        provenance: "v_profitability_alerts",
        content,
        chars: content.length,
      })
    }

    // CA trimestriel par mission
    for (const row of quarterlyRows) {
      if (!row.mission_id || !row.quarter_start) continue

      const content = compose([
        line("Mission", row.mission_title),
        line("Statut mission", row.mission_status),
        line("Trimestre", row.quarter_label ?? formatMonth(row.quarter_start)),
        line("Compte client", row.company_name),
        line("Consultant", row.consultant_name),
        line("Practice", row.practice),
        line("Rôle", row.role_title),
        line("Séniorité", row.seniority),
        line("Chiffre d'affaires", formatCurrency(row.revenue)),
        line("Coût", formatCurrency(row.cost)),
        line("Marge brute (valeur)", formatCurrency(row.gross_margin)),
        line("Marge brute (%)", formatPercent(row.gross_margin_pct)),
        line("Jours facturables", row.billable_days),
      ])

      if (!content) continue

      items.push({
        ref: {
          kind: "account_delivery",
          table: "v_mission_quarterly_revenue",
          id: `${row.mission_id}:${row.quarter_start}`,
        },
        title: `CA trimestriel · ${row.mission_title ?? "Mission"} · ${row.quarter_label ?? formatMonth(row.quarter_start)}`,
        date: row.quarter_start,
        provenance: "v_mission_quarterly_revenue",
        content,
        chars: content.length,
      })
    }

    return { items, exclusions }
  },
}
