import "server-only"

/**
 * Provider de corpus `delivery_period` — ADR-0020 §5.1 et handoff L6.
 *
 * Hydrate les données financières et d'activité du centre de profit sur une fenêtre
 * temporelle de 4 mois calendaires : le mois analysé (`periodStart`/`periodEnd` du
 * sélecteur) et les 3 mois d'historique qui le précèdent.
 *
 * ── POURQUOI CETTE PROFONDEUR ───────────────────────────────────────────────────
 * Un mois isolé ne permet d'identifier aucune tendance ni dérive. Remonter de 3 mois
 * permet de comparer le P&L, l'activité CRA et les marges à l'historique récent
 * (ex: détecter un décrochage de marge brute ou de jours facturés vs M-1).
 * La profondeur (3 mois d'historique) est dérivée côté serveur par le provider et
 * n'est jamais exposée à l'appelant (garde contre le coût LLM).
 *
 * ── MODE D'EXÉCUTION : `user_rls` ET CONFIDENTIALITÉ ─────────────────────────────
 * Les 5 sources interrogées sont accessibles en `user_rls` (`security_invoker = true`).
 * Le `.eq("workspace_id", ctx.workspaceId)` est systématiquement posé sur chaque
 * relation portant la colonne workspace_id comme seconde serrure.
 *
 * 🔴 RÈGLE DE CONFIDENTIALITÉ NON NÉGOCIABLE :
 * La vue `v_collaborator_activity_summary` porte une colonne `gross_annual` (salaire
 * annuel brut). Ce provider ne la sélectionne JAMAIS dans sa clause `.select(...)`,
 * et aucune référence au salaire brut n'entre dans `content`. Cela garantit que les
 * résultats archivés (`ai_intelligence_results`), lisibles par tous les rôles du
 * workspace, ne fassent jamais fuiter de données salariales nominatives.
 *
 * ── PRÉ-CALCUL DES NOMBRES ET ÉCARTS ─────────────────────────────────────────────
 * Ce provider hydrate des faits chiffrés, pas de la prose. Pour éviter que le LLM
 * ne recalcule des ratios ou des écarts (source d'hallucinations crédibles), tous les
 * montants, pourcentages de marge et écarts signés vs M-1 sont pré-calculés et formatés
 * en clair dans `content`.
 */

import type {
  CorpusExclusion,
  CorpusItem,
  CorpusProvider,
  CorpusProviderResult,
  CorpusResolveContext,
} from "../../domain/mission-contracts"

/** Priorité de conservation — ancre chiffrée de la rentabilité (poids maximal). */
export const DELIVERY_PERIOD_WEIGHT = 95

/** Bornes dures de requête : gardes de volume, pas des règles métier. */
export const PNL_MONTHLY_QUERY_LIMIT = 50
export const COLLABORATOR_ACTIVITY_QUERY_LIMIT = 500
export const PROFITABILITY_ALERTS_QUERY_LIMIT = 500
export const MISSION_QUARTERLY_QUERY_LIMIT = 500
export const MISSIONS_QUERY_LIMIT = 100

/**
 * Dérive la fenêtre d'hydratation de 4 mois calendaires :
 * le mois analysé + 3 mois calendaires d'historique avant `periodStart`.
 */
export function deriveHydrationWindow(
  periodStart: string,
  periodEnd: string,
): { windowStart: string; windowEnd: string } {
  const [yStr, mStr] = periodStart.split("-")
  const year = parseInt(yStr, 10)
  const month = parseInt(mStr, 10)
  let startYear = year
  let startMonth = month - 3
  while (startMonth <= 0) {
    startMonth += 12
    startYear -= 1
  }
  const windowStart = `${startYear}-${String(startMonth).padStart(2, "0")}-01`
  return { windowStart, windowEnd: periodEnd }
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

export function formatPtsDiff(
  current: number | null | undefined,
  prev: number | null | undefined,
  prevMonthLabel: string,
): string | null {
  if (current === null || current === undefined || prev === null || prev === undefined) return null
  const diff = Math.round((current - prev) * 100) / 100
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : ""
  const absDiff = Math.abs(diff)
  const isInteger = Number.isInteger(absDiff)
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(absDiff)
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
  const unit = absDiff <= 1 ? "pt" : "pts"
  return `${sign}${formatted} ${unit} vs ${prevMonthLabel}`
}

export function formatCurrencyDiff(
  current: number | null | undefined,
  prev: number | null | undefined,
  prevMonthLabel: string,
): string | null {
  if (current === null || current === undefined || prev === null || prev === undefined) return null
  const diff = Math.round((current - prev) * 100) / 100
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : ""
  const absDiff = Math.abs(diff)
  const isInteger = Number.isInteger(absDiff)
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  })
    .format(absDiff)
    .replace(/\u202F/g, " ")
    .replace(/\u00A0/g, " ")
  const pctDiff = prev !== 0 ? Math.round(((current - prev) / Math.abs(prev)) * 10000) / 100 : null
  let pctStr = ""
  if (pctDiff !== null) {
    const pctSign = pctDiff > 0 ? "+" : pctDiff < 0 ? "−" : ""
    const absPct = Math.abs(pctDiff)
    const formattedPct = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: Number.isInteger(absPct) ? 0 : 2,
      maximumFractionDigits: 2,
    })
      .format(absPct)
      .replace(/\u202F/g, " ")
      .replace(/\u00A0/g, " ")
    pctStr = ` (${pctSign}${formattedPct} %)`
  }
  return `${sign}${formatted} €${pctStr} vs ${prevMonthLabel}`
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
    ref: { kind: "delivery_period", table, id: "__query_limit__" },
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

export const deliveryPeriodProvider: CorpusProvider<{
  kind: "delivery_period"
  periodStart: string
  periodEnd: string
}> = {
  kind: "delivery_period",
  execution: "user_rls",
  weight: DELIVERY_PERIOD_WEIGHT,

  async resolve(ctx: CorpusResolveContext, selector): Promise<CorpusProviderResult> {
    const items: CorpusItem[] = []
    const exclusions: CorpusExclusion[] = []

    const { windowStart, windowEnd } = deriveHydrationWindow(
      selector.periodStart,
      selector.periodEnd,
    )

    const firstQuarterStart = getQuarterStart(windowStart)
    const lastQuarterStart = getQuarterStart(windowEnd)

    // Les 5 lectures sont autonomes et exécutées en parallèle.
    const [
      pnlResult,
      activityResult,
      alertsResult,
      quarterlyResult,
      missionsResult,
    ] = await Promise.all([
      ctx.supabase
        .from("pnl_monthly")
        .select(
          "id, period_month, revenue_total, gross_margin_value, gross_margin_percent, operating_profit_value, operating_profit_percent, direct_costs_salaries, direct_costs_subcontractors, structural_costs_rent, structural_costs_it, structural_costs_mgmt, source",
        )
        .eq("workspace_id", ctx.workspaceId)
        .gte("period_month", windowStart)
        .lte("period_month", windowEnd)
        .order("period_month", { ascending: true })
        .limit(PNL_MONTHLY_QUERY_LIMIT),

      // 🔴 RÈGLE DE CONFIDENTIALITÉ : gross_annual n'est JAMAIS sélectionné.
      ctx.supabase
        .from("v_collaborator_activity_summary")
        .select(
          "collaborator_id, full_name, period_start, business_days, billable_days, non_billable_days, pto_days, sick_days, activity_rate_percent, revenue, employer_cost, real_margin, real_margin_pct, theoretical_margin_pct, daily_employer_cost, cra_status, collab_status, tjm_snapshot, cjm_snapshot",
        )
        .gte("period_start", windowStart)
        .lte("period_start", windowEnd)
        .order("period_start", { ascending: true })
        .limit(COLLABORATOR_ACTIVITY_QUERY_LIMIT),

      ctx.supabase
        .from("v_profitability_alerts")
        .select(
          "collaborator_id, full_name, period_start, cra_status, activity_rate_percent, real_margin_pct, alert_low_activity, alert_low_margin, alert_negative_margin, alert_high_sick_days, alert_cra_not_validated",
        )
        .gte("period_start", windowStart)
        .lte("period_start", windowEnd)
        .order("period_start", { ascending: true })
        .limit(PROFITABILITY_ALERTS_QUERY_LIMIT),

      ctx.supabase
        .from("v_mission_quarterly_revenue")
        .select(
          "mission_id, mission_title, mission_status, company_id, company_name, consultant_name, practice, quarter_label, quarter_start, revenue, cost, gross_margin, gross_margin_pct, billable_days, role_title, seniority",
        )
        .eq("workspace_id", ctx.workspaceId)
        .gte("quarter_start", firstQuarterStart)
        .lte("quarter_start", lastQuarterStart)
        .order("quarter_start", { ascending: true })
        .limit(MISSION_QUARTERLY_QUERY_LIMIT),

      ctx.supabase
        .from("missions")
        .select(
          "id, title, status, tjm, cjm, gross_margin_pct, practice, start_date, end_date",
        )
        .eq("workspace_id", ctx.workspaceId)
        .lte("start_date", windowEnd)
        .order("start_date", { ascending: true })
        .limit(MISSIONS_QUERY_LIMIT),
    ])

    if (pnlResult.error) {
      throw new Error(`Lecture du P&L mensuel impossible : ${pnlResult.error.message}`)
    }
    if (activityResult.error) {
      throw new Error(`Lecture de l'activité des collaborateurs impossible : ${activityResult.error.message}`)
    }
    if (alertsResult.error) {
      throw new Error(`Lecture des alertes de rentabilité impossible : ${alertsResult.error.message}`)
    }
    if (quarterlyResult.error) {
      throw new Error(`Lecture du CA trimestriel par mission impossible : ${quarterlyResult.error.message}`)
    }
    if (missionsResult.error) {
      throw new Error(`Lecture du référentiel des missions impossible : ${missionsResult.error.message}`)
    }

    // ── GESTION DES BORNES DURES ───────────────────────────────────────────────
    const pnlRows = pnlResult.data ?? []
    if (pnlRows.length === PNL_MONTHLY_QUERY_LIMIT) {
      exclusions.push(capExclusion("pnl_monthly", "P&L mensuel", PNL_MONTHLY_QUERY_LIMIT))
    }

    const activityRows = activityResult.data ?? []
    if (activityRows.length === COLLABORATOR_ACTIVITY_QUERY_LIMIT) {
      exclusions.push(
        capExclusion(
          "v_collaborator_activity_summary",
          "Synthèse d'activité collaborateurs",
          COLLABORATOR_ACTIVITY_QUERY_LIMIT,
        ),
      )
    }

    const alertRows = alertsResult.data ?? []
    if (alertRows.length === PROFITABILITY_ALERTS_QUERY_LIMIT) {
      exclusions.push(
        capExclusion(
          "v_profitability_alerts",
          "Alertes de rentabilité",
          PROFITABILITY_ALERTS_QUERY_LIMIT,
        ),
      )
    }

    const quarterlyRows = quarterlyResult.data ?? []
    if (quarterlyRows.length === MISSION_QUARTERLY_QUERY_LIMIT) {
      exclusions.push(
        capExclusion(
          "v_mission_quarterly_revenue",
          "CA trimestriel par mission",
          MISSION_QUARTERLY_QUERY_LIMIT,
        ),
      )
    }

    const missionRows = missionsResult.data ?? []
    if (missionRows.length === MISSIONS_QUERY_LIMIT) {
      exclusions.push(
        capExclusion("missions", "Référentiel des missions", MISSIONS_QUERY_LIMIT),
      )
    }

    // ── 1. P&L MENSUEL ────────────────────────────────────────────────────────
    for (let i = 0; i < pnlRows.length; i++) {
      const row = pnlRows[i]
      if (!row.id) continue
      const prev = i > 0 ? pnlRows[i - 1] : null
      const prevMonthLabel = prev ? formatMonth(prev.period_month) : ""

      const revenueFormatted = formatCurrency(row.revenue_total)
      const revenueDiff = prev
        ? formatCurrencyDiff(row.revenue_total, prev.revenue_total, prevMonthLabel)
        : null
      const revenueLine = revenueFormatted
        ? `Chiffre d'affaires : ${revenueFormatted}${revenueDiff ? ` (${revenueDiff})` : ""}`
        : null

      const grossMarginVal = formatCurrency(row.gross_margin_value)
      const grossMarginPct = formatPercent(row.gross_margin_percent)
      const grossMarginPtsDiff = prev
        ? formatPtsDiff(row.gross_margin_percent, prev.gross_margin_percent, prevMonthLabel)
        : null
      const grossMarginLine = grossMarginPct
        ? `Marge brute : ${grossMarginPct}${grossMarginPtsDiff ? ` (${grossMarginPtsDiff})` : ""}${grossMarginVal ? ` (${grossMarginVal})` : ""}`
        : null

      const opProfitVal = formatCurrency(row.operating_profit_value)
      const opProfitPct = formatPercent(row.operating_profit_percent)
      const opProfitPtsDiff = prev
        ? formatPtsDiff(row.operating_profit_percent, prev.operating_profit_percent, prevMonthLabel)
        : null
      const opProfitLine = opProfitPct
        ? `Résultat d'exploitation : ${opProfitPct}${opProfitPtsDiff ? ` (${opProfitPtsDiff})` : ""}${opProfitVal ? ` (${opProfitVal})` : ""}`
        : null

      const content = compose([
        line("Mois", formatMonth(row.period_month)),
        revenueLine,
        grossMarginLine,
        opProfitLine,
        line("Coûts directs salaires", formatCurrency(row.direct_costs_salaries)),
        line("Coûts directs sous-traitance", formatCurrency(row.direct_costs_subcontractors)),
        line("Coûts de structure IT", formatCurrency(row.structural_costs_it)),
        line("Coûts de structure loyer", formatCurrency(row.structural_costs_rent)),
        line("Coûts de structure management", formatCurrency(row.structural_costs_mgmt)),
        line("Source", row.source),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "delivery_period", table: "pnl_monthly", id: row.id },
        title: `P&L mensuel · ${formatMonth(row.period_month)}`,
        date: row.period_month,
        provenance: "pnl_monthly",
        content,
        chars: content.length,
      })
    }

    // ── 2. SYNTHÈSE ACTIVITÉ COLLABORATEURS ───────────────────────────────────
    for (const row of activityRows) {
      if (!row.collaborator_id || !row.period_start) continue

      const content = compose([
        line("Collaborateur", row.full_name),
        line("Période", formatMonth(row.period_start)),
        line("Jours ouvrés", row.business_days),
        line("Jours facturables", row.billable_days),
        line("Jours non facturables", row.non_billable_days),
        line("Congés payés (jours)", row.pto_days),
        line("Arrêt maladie (jours)", row.sick_days),
        line("Taux d'activité", formatPercent(row.activity_rate_percent)),
        line("Chiffre d'affaires", formatCurrency(row.revenue)),
        line("Coût employeur", formatCurrency(row.employer_cost)),
        line("Marge réelle (valeur)", formatCurrency(row.real_margin)),
        line("Marge réelle (%)", formatPercent(row.real_margin_pct)),
        line("Marge théorique (%)", formatPercent(row.theoretical_margin_pct)),
        line("CJM journalier snapshot", formatCurrency(row.daily_employer_cost ?? row.cjm_snapshot)),
        line("TJM snapshot", formatCurrency(row.tjm_snapshot)),
        line("Statut CRA", row.cra_status),
        line("Statut collaborateur", row.collab_status),
      ])

      if (!content) continue

      items.push({
        ref: {
          kind: "delivery_period",
          table: "v_collaborator_activity_summary",
          id: `${row.collaborator_id}:${row.period_start}`,
        },
        title: `Activité · ${row.full_name ?? "Collaborateur"} · ${formatMonth(row.period_start)}`,
        date: row.period_start,
        provenance: "v_collaborator_activity_summary",
        content,
        chars: content.length,
      })
    }

    // ── 3. ALERTES DE RENTABILITÉ ────────────────────────────────────────────
    for (const row of alertRows) {
      if (!row.collaborator_id || !row.period_start) continue
      const alerts = getAlertLabels(row)
      // Une ligne sans alerte active ne produit aucun item.
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
          kind: "delivery_period",
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

    // ── 4. CA TRIMESTRIEL PAR MISSION ────────────────────────────────────────
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
          kind: "delivery_period",
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

    // ── 5. RÉFÉRENTIEL DES MISSIONS ──────────────────────────────────────────
    for (const row of missionRows) {
      if (!row.id) continue
      // Garde de dates pour les missions actives sur la fenêtre
      if (row.start_date && row.start_date > windowEnd) continue
      if (row.end_date !== null && row.end_date < windowStart) continue

      const content = compose([
        line("Titre", row.title),
        line("Statut", row.status),
        line("Practice", row.practice),
        line("TJM", formatCurrency(row.tjm)),
        line("CJM", formatCurrency(row.cjm)),
        line("Marge brute (%)", formatPercent(row.gross_margin_pct)),
        line("Date de début", row.start_date),
        line("Date de fin", row.end_date ?? "En cours"),
      ])

      if (!content) continue

      items.push({
        ref: { kind: "delivery_period", table: "missions", id: row.id },
        title: `Référentiel mission · ${row.title}`,
        date: row.start_date,
        provenance: "missions",
        content,
        chars: content.length,
      })
    }

    return { items, exclusions }
  },
}
