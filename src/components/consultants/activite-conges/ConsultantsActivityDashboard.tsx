import { cn } from "@/lib/utils"

export type ActivitySummaryRow = {
  collaborator_id: string
  full_name: string | null
  entry_date: string | null
  collab_status: string | null
  period_start: string
  business_days: number | null
  billable_days: number | null
  pto_days: number | null
  sick_days: number | null
  non_billable_days: number | null
  activity_rate_percent: number | null
  cra_status: string | null
  tjm_snapshot: number | null
  cjm_snapshot: number | null
  revenue: number | null
  employer_cost: number | null
  real_margin: number | null
  real_margin_pct: number | null
  theoretical_margin_pct: number | null
  daily_employer_cost: number | null
  gross_annual: number | null
}

export type YtdActivityRow = {
  collaborator_id: string
  full_name: string | null
  entry_date: string | null
  year: number | null
  months_covered: number | null
  total_business_days: number | null
  total_billable_days: number | null
  total_pto_days: number | null
  total_sick_days: number | null
  total_non_billable_days: number | null
  ytd_activity_rate: number | null
  taci_target: number | null
  gap_vs_target: number | null
  ytd_revenue: number | null
  ytd_employer_cost: number | null
  ytd_real_margin: number | null
}

export type ProfitabilityAlertRow = {
  collaborator_id: string
  full_name: string | null
  period_start: string
  activity_rate_percent: number | null
  real_margin_pct: number | null
  cra_status: string | null
  alert_low_activity: boolean | null
  alert_low_margin: boolean | null
  alert_negative_margin: boolean | null
  alert_high_sick_days: boolean | null
  alert_cra_not_validated: boolean | null
}

export type AbsenceType =
  | "conge_paye"
  | "rtt"
  | "maladie"
  | "sans_solde"
  | "contrainte_perso"
  | "formation"
  | "fermeture_client"
  | "autre"

export type AbsenceRow = {
  id: string
  collaborator_id: string
  absence_type: AbsenceType
  start_date: string
  end_date: string
  duration_days: number
  notes: string | null
  collaborator: {
    id: string
    current_title: string | null
    practice: string | null
    person: { full_name: string | null } | null
  } | null
}

export type ClientClosureRow = {
  id: string
  company_id: string
  start_date: string
  end_date: string
  label: string
  is_recurring: boolean
  notes: string | null
  company: { id: string; name: string | null } | null
}

export type CompensationRow = {
  id: string
  collaborator_id: string
  effective_from: string
  effective_to: string | null
  gross_annual: number | null
  charges_rate: number | null
  working_days_per_year: number | null
  taci: number | null
  cjm: number | null
  collaborator: {
    id: string
    current_title: string | null
    person: { full_name: string | null } | null
  } | null
}

export type ActivityDashboardData = {
  year: number
  generatedAt: string
  summaries: ActivitySummaryRow[]
  ytd: YtdActivityRow[]
  alerts: ProfitabilityAlertRow[]
  absences: AbsenceRow[]
  closures: ClientClosureRow[]
  compensations: CompensationRow[]
  sourceIssues: string[]
}

type MonthlyAggregate = {
  month: string
  index: number
  businessDays: number
  billableDays: number
  activityRate: number
  ptoDays: number
  sickDays: number
  nonBillableDays: number
  revenue: number
  realMargin: number
  realMarginPct: number | null
  craCoveragePct: number
}

type AbsenceImpact = {
  absence: AbsenceRow
  lostRevenue: number
  absorbedCost: number
  marginPressure: number
}

const MONTHS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"]

const UNPLANNED_ABSENCES: AbsenceType[] = ["maladie", "contrainte_perso", "sans_solde", "autre"]

const ABSENCE_LABELS: Record<AbsenceType, string> = {
  conge_paye: "Conges payes",
  rtt: "RTT",
  maladie: "Maladie",
  sans_solde: "Sans solde",
  contrainte_perso: "Contrainte perso",
  formation: "Formation",
  fermeture_client: "Fermeture client",
  autre: "Absence diverse",
}

const ABSENCE_TONES: Record<AbsenceType, string> = {
  conge_paye: "bg-primary text-primary-fg",
  rtt: "bg-success text-primary-fg",
  maladie: "bg-danger text-primary-fg",
  sans_solde: "bg-warning text-secondary-fg",
  contrainte_perso: "bg-accent text-primary-fg",
  formation: "bg-secondary text-secondary-fg",
  fermeture_client: "bg-heading text-primary-fg",
  autre: "bg-muted text-primary-fg",
}

function n(value: number | null | undefined): number {
  return Number(value ?? 0)
}

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

function eur(value: number | null | undefined, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    ...options,
  }).format(n(value))
}

function numberFr(value: number | null | undefined, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: digits,
  }).format(n(value))
}

function monthIndex(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCMonth()
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00Z`))
}

function dayPosition(date: string, year: number): number {
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year, 11, 31)
  const current = new Date(`${date}T00:00:00Z`).getTime()
  return clamp(((current - start) / (end - start)) * 100)
}

function durationPosition(startDate: string, endDate: string, year: number): { left: number; width: number } {
  const left = dayPosition(startDate, year)
  const right = dayPosition(endDate, year)
  return {
    left,
    width: Math.max(1.2, right - left + 0.9),
  }
}

function collaboratorName(absence: AbsenceRow): string {
  return absence.collaborator?.person?.full_name ?? "Collaborateur inconnu"
}

function getMonthlyAggregates(rows: ActivitySummaryRow[]): MonthlyAggregate[] {
  return MONTHS.map((month, index) => {
    const monthRows = rows.filter((row) => monthIndex(row.period_start) === index)
    const businessDays = monthRows.reduce((sum, row) => sum + n(row.business_days), 0)
    const billableDays = monthRows.reduce((sum, row) => sum + n(row.billable_days), 0)
    const revenue = monthRows.reduce((sum, row) => sum + n(row.revenue), 0)
    const realMargin = monthRows.reduce((sum, row) => sum + n(row.real_margin), 0)
    const validated = monthRows.filter((row) => row.cra_status === "validated").length

    return {
      month,
      index,
      businessDays,
      billableDays,
      activityRate: pct(billableDays, businessDays),
      ptoDays: monthRows.reduce((sum, row) => sum + n(row.pto_days), 0),
      sickDays: monthRows.reduce((sum, row) => sum + n(row.sick_days), 0),
      nonBillableDays: monthRows.reduce((sum, row) => sum + n(row.non_billable_days), 0),
      revenue,
      realMargin,
      realMarginPct: revenue > 0 ? pct(realMargin, revenue) : null,
      craCoveragePct: monthRows.length ? pct(validated, monthRows.length) : 0,
    }
  })
}

function getAbsenceImpact(absence: AbsenceRow, summaries: ActivitySummaryRow[], compensations: CompensationRow[]): AbsenceImpact {
  const periodMonth = monthIndex(absence.start_date)
  const matchingSummary = summaries.find(
    (row) =>
      row.collaborator_id === absence.collaborator_id &&
      monthIndex(row.period_start) === periodMonth
  )
  const compensation = compensations.find((row) => row.collaborator_id === absence.collaborator_id)
  const tjm = n(matchingSummary?.tjm_snapshot)
  const dailyCost = n(matchingSummary?.daily_employer_cost ?? compensation?.cjm)
  const duration = n(absence.duration_days)

  return {
    absence,
    lostRevenue: duration * tjm,
    absorbedCost: duration * dailyCost,
    marginPressure: duration * tjm,
  }
}

function getAlertLabels(alert: ProfitabilityAlertRow): string[] {
  return [
    alert.alert_negative_margin && "Marge negative",
    alert.alert_low_margin && "Marge faible",
    alert.alert_low_activity && "Activite faible",
    alert.alert_high_sick_days && "Maladie elevee",
    alert.alert_cra_not_validated && "CRA non valide",
  ].filter(Boolean) as string[]
}

export function ConsultantsActivityDashboard({ data }: { data: ActivityDashboardData }) {
  const monthly = getMonthlyAggregates(data.summaries)
  const totalBusinessDays = data.ytd.reduce((sum, row) => sum + n(row.total_business_days), 0)
  const totalBillableDays = data.ytd.reduce((sum, row) => sum + n(row.total_billable_days), 0)
  const totalRevenue = data.ytd.reduce((sum, row) => sum + n(row.ytd_revenue), 0)
  const totalEmployerCost = data.ytd.reduce((sum, row) => sum + n(row.ytd_employer_cost), 0)
  const totalRealMargin = data.ytd.reduce((sum, row) => sum + n(row.ytd_real_margin), 0)
  const globalActivityRate = pct(totalBillableDays, totalBusinessDays)
  const realMarginPct = totalRevenue > 0 ? pct(totalRealMargin, totalRevenue) : 0
  const activeAlerts = data.alerts
    .filter((alert) => getAlertLabels(alert).length > 0)
    .sort((a, b) => n(a.real_margin_pct) - n(b.real_margin_pct))
  const absenceImpacts = data.absences
    .filter((absence) => UNPLANNED_ABSENCES.includes(absence.absence_type))
    .map((absence) => getAbsenceImpact(absence, data.summaries, data.compensations))
    .sort((a, b) => b.marginPressure - a.marginPressure)
  const plannedAbsences = data.absences
    .slice()
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
  const financialRows = data.ytd
    .map((row) => {
      const summaryRows = data.summaries.filter((summary) => summary.collaborator_id === row.collaborator_id)
      const compensation = data.compensations.find((item) => item.collaborator_id === row.collaborator_id)
      const revenue = n(row.ytd_revenue)
      const realMargin = n(row.ytd_real_margin)
      const totalBillable = summaryRows.reduce((sum, summary) => sum + n(summary.billable_days), 0)
      const avgTjm = totalBillable ? revenue / totalBillable : n(summaryRows[0]?.tjm_snapshot)
      const theoreticalMarginValues = summaryRows
        .map((summary) => summary.theoretical_margin_pct)
        .filter((value): value is number => value !== null)
      const theoreticalMargin = theoreticalMarginValues.length
        ? theoreticalMarginValues.reduce((sum, value) => sum + value, 0) / theoreticalMarginValues.length
        : null

      return {
        ...row,
        grossAnnual: compensation?.gross_annual ?? summaryRows.find((summary) => summary.gross_annual)?.gross_annual ?? null,
        avgTjm,
        theoreticalMargin,
        realProfitability: revenue > 0 ? pct(realMargin, revenue) : null,
      }
    })
    .sort((a, b) => n(a.realProfitability) - n(b.realProfitability))

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-6 py-6">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-heading px-6 py-5 text-primary-fg">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 20%, var(--color-primary) 0, transparent 34%), linear-gradient(135deg, transparent 0, var(--color-primary-deep) 100%)",
          }}
          aria-hidden="true"
        />
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary-fg/70">
              Cockpit annuel {data.year}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-black tracking-tight">
              Activite & conges
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-primary-fg/78">
              Productivite CRA, absences, rentabilite reelle et fermetures client sur une seule surface de pilotage.
            </p>
          </div>
          <div className="grid min-w-[420px] grid-cols-3 overflow-hidden rounded-xl border border-primary-fg/15 bg-primary-fg/8">
            <HeroStat label="Activite globale" value={`${numberFr(globalActivityRate)} %`} />
            <HeroStat label="Marge reelle" value={`${numberFr(realMarginPct)} %`} />
            <HeroStat label="Alertes" value={String(activeAlerts.length)} />
          </div>
        </div>
      </header>

      {data.sourceIssues.length > 0 && (
        <section className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-heading">
          <strong>Sources partielles.</strong> {data.sourceIssues.join(" ")}
        </section>
      )}

      <section className="grid grid-cols-4 gap-3">
        <MetricCard
          label="Jours factures"
          value={numberFr(totalBillableDays)}
          helper={`${numberFr(totalBusinessDays)} jours ouvrables couverts`}
          tone="primary"
        />
        <MetricCard
          label="CA YTD"
          value={eur(totalRevenue)}
          helper={`Marge ${eur(totalRealMargin)} · cout ${eur(totalEmployerCost)}`}
          tone="success"
        />
        <MetricCard
          label="Impact absences imprevues"
          value={eur(absenceImpacts.reduce((sum, impact) => sum + impact.marginPressure, 0))}
          helper={`${numberFr(absenceImpacts.reduce((sum, impact) => sum + n(impact.absence.duration_days), 0))} jours non prevus`}
          tone="danger"
        />
        <MetricCard
          label="Fermetures client"
          value={String(data.closures.length)}
          helper={`${data.closures.filter((closure) => closure.is_recurring).length} recurrentes`}
          tone="accent"
        />
      </section>

      <main className="grid grid-cols-[minmax(0,1.35fr)_minmax(420px,0.65fr)] gap-5">
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader
              eyebrow="CRA mensuels"
              title="Productivite globale des collaborateurs en mission"
              note="Taux calcule en jours factures / jours ouvrables couverts par les CRA."
            />
            <div className="mt-5 grid grid-cols-12 gap-2">
              {monthly.map((month) => (
                <div key={month.month} className="flex min-h-56 flex-col justify-end gap-2">
                  <div className="relative flex h-44 items-end rounded-xl border border-border bg-canvas px-1.5 pb-1.5">
                    <div
                      className={cn(
                        "w-full rounded-lg transition-all",
                        month.activityRate >= 85
                          ? "bg-success"
                          : month.activityRate >= 70
                            ? "bg-warning"
                            : "bg-danger"
                      )}
                      style={{ height: `${clamp(month.activityRate, 3, 100)}%` }}
                      title={`${month.month}: ${numberFr(month.activityRate)} % d'activite`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-heading">{month.month}</p>
                    <p className="text-[11px] text-muted">{numberFr(month.activityRate)} %</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <InlineSummary label="Conges CRA" value={`${numberFr(monthly.reduce((sum, month) => sum + month.ptoDays, 0))} j`} />
              <InlineSummary label="Maladie CRA" value={`${numberFr(monthly.reduce((sum, month) => sum + month.sickDays, 0))} j`} />
              <InlineSummary label="CRA valides" value={`${numberFr(pct(monthly.reduce((sum, month) => sum + month.craCoveragePct, 0), 12))} %`} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader
              eyebrow="Planning"
              title="Conges et absences sur l'annee"
              note="Chaque ligne reprend les absences datees issues de collaborator_absences."
            />
            <div className="mt-5 rounded-xl border border-border">
              <div className="grid grid-cols-[190px_minmax(0,1fr)] border-b border-border bg-canvas/70">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  Collaborateur
                </div>
                <div className="grid grid-cols-12 divide-x divide-border">
                  {MONTHS.map((month) => (
                    <div key={month} className="px-2 py-2 text-center text-[10px] font-bold text-muted">
                      {month}
                    </div>
                  ))}
                </div>
              </div>
              <div className="max-h-[430px] overflow-y-auto">
                {plannedAbsences.map((absence) => {
                  const position = durationPosition(absence.start_date, absence.end_date, data.year)

                  return (
                    <div key={absence.id} className="grid grid-cols-[190px_minmax(0,1fr)] border-b border-border last:border-b-0">
                      <div className="min-w-0 px-3 py-3">
                        <p className="truncate text-xs font-bold text-heading">{collaboratorName(absence)}</p>
                        <p className="truncate text-[11px] text-muted">{ABSENCE_LABELS[absence.absence_type]}</p>
                      </div>
                      <div className="relative min-h-14">
                        <div className="absolute inset-0 grid grid-cols-12 divide-x divide-border/70" aria-hidden="true">
                          {MONTHS.map((month) => <span key={month} />)}
                        </div>
                        <span
                          className={cn(
                            "absolute top-1/2 h-6 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-bold leading-4 shadow-sm",
                            ABSENCE_TONES[absence.absence_type]
                          )}
                          style={{ left: `${position.left}%`, width: `${position.width}%` }}
                          title={`${ABSENCE_LABELS[absence.absence_type]} - ${shortDate(absence.start_date)} au ${shortDate(absence.end_date)} (${numberFr(absence.duration_days)} j)`}
                        >
                          {numberFr(absence.duration_days)}j
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader
              eyebrow="Finance"
              title="Rentabilite theorique vs activite reelle"
              note="Salaire et CJM proviennent de collaborator_compensation quand l'acces RLS le permet."
            />
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-canvas text-muted">
                  <tr>
                    {["Consultant", "Salaire", "Prix vente", "Marge theor.", "Activite", "Rentabilite reelle"].map((header) => (
                      <th key={header} className="px-3 py-2.5 font-bold uppercase tracking-[0.12em]">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {financialRows.map((row) => (
                    <tr key={row.collaborator_id} className="hover:bg-canvas/60">
                      <td className="px-3 py-3">
                        <p className="font-bold text-heading">{row.full_name ?? "Consultant inconnu"}</p>
                        <p className="text-[11px] text-muted">{row.months_covered} mois couverts</p>
                      </td>
                      <td className="px-3 py-3 font-semibold tabular-nums text-body">
                        {row.grossAnnual ? eur(row.grossAnnual) : "Acces admin requis"}
                      </td>
                      <td className="px-3 py-3 font-semibold tabular-nums text-heading">{eur(row.avgTjm)}/j</td>
                      <td className="px-3 py-3 tabular-nums text-body">
                        {row.theoreticalMargin === null ? "-" : `${numberFr(row.theoreticalMargin)} %`}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-body">{numberFr(row.ytd_activity_rate)} %</td>
                      <td className="px-3 py-3">
                        <ProfitBadge value={row.realProfitability} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader
              eyebrow="YTD"
              title="Activite moyenne par collaborateur"
              note="Taux pondere depuis janvier ou depuis l'arrivee."
            />
            <div className="mt-4 space-y-3">
              {data.ytd
                .slice()
                .sort((a, b) => n(a.ytd_activity_rate) - n(b.ytd_activity_rate))
                .map((row) => (
                  <div key={row.collaborator_id}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate font-bold text-heading">{row.full_name ?? "Consultant inconnu"}</span>
                      <span className="font-bold tabular-nums text-body">{numberFr(row.ytd_activity_rate)} %</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          n(row.ytd_activity_rate) >= 85
                            ? "bg-success"
                            : n(row.ytd_activity_rate) >= 70
                              ? "bg-warning"
                              : "bg-danger"
                        )}
                        style={{ width: `${clamp(n(row.ytd_activity_rate))}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </section>

          <section className="rounded-2xl border border-danger/25 bg-danger/5 p-5">
            <SectionHeader
              eyebrow="Absences non prevues"
              title="Impact rentabilite"
              note="CA non facture et cout employeur absorbe, rattaches au mois d'absence."
            />
            <div className="mt-4 space-y-3">
              {absenceImpacts.length === 0 ? (
                <EmptyState label="Aucune absence non prevue sur la periode." />
              ) : (
                absenceImpacts.map((impact) => (
                  <div key={impact.absence.id} className="rounded-xl border border-border bg-surface px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-heading">{collaboratorName(impact.absence)}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {shortDate(impact.absence.start_date)} {"->"} {shortDate(impact.absence.end_date)} · {ABSENCE_LABELS[impact.absence.absence_type]}
                        </p>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", ABSENCE_TONES[impact.absence.absence_type])}>
                        {numberFr(impact.absence.duration_days)}j
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <InlineSummary label="CA non facture" value={eur(impact.lostRevenue)} />
                      <InlineSummary label="Cout absorbe" value={eur(impact.absorbedCost)} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader
              eyebrow="Alertes"
              title="Rentabilites les plus faibles"
              note="Priorise les mois a marge negative, marge faible ou activite faible."
            />
            <div className="mt-4 space-y-2">
              {activeAlerts.length === 0 ? (
                <EmptyState label="Aucune alerte active." />
              ) : (
                activeAlerts.slice(0, 10).map((alert) => (
                  <div key={`${alert.collaborator_id}-${alert.period_start}`} className="rounded-xl border border-border bg-canvas/45 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-heading">{alert.full_name ?? "Consultant inconnu"}</p>
                        <p className="text-[11px] text-muted">{MONTHS[monthIndex(alert.period_start)]} {data.year}</p>
                      </div>
                      <ProfitBadge value={alert.real_margin_pct} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {getAlertLabels(alert).map((label) => (
                        <span key={label} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-body">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader
              eyebrow="Sites client"
              title="Fermetures annuelles"
              note="Periodes de fermeture a integrer au pilotage de staffing et facturation."
            />
            <div className="mt-4 space-y-3">
              {data.closures.map((closure) => {
                const position = durationPosition(closure.start_date, closure.end_date, data.year)

                return (
                  <div key={closure.id} className="rounded-xl border border-border bg-canvas/45 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-heading">{closure.company?.name ?? "Client inconnu"}</p>
                        <p className="text-[11px] text-muted">
                          {closure.label} · {shortDate(closure.start_date)} {"->"} {shortDate(closure.end_date)}
                        </p>
                      </div>
                      {closure.is_recurring && (
                        <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-fg">
                          Annuel
                        </span>
                      )}
                    </div>
                    <div className="relative mt-3 h-2 rounded-full bg-border">
                      <span
                        className="absolute top-0 h-2 rounded-full bg-heading"
                        style={{ left: `${position.left}%`, width: `${position.width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </main>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <SectionHeader
          eyebrow="Registre"
          title="Liste exhaustive des absences et conges"
          note={`${plannedAbsences.length} enregistrements sur ${data.year}.`}
        />
        <div className="mt-4 grid grid-cols-2 gap-2">
          {plannedAbsences.map((absence) => (
            <div key={absence.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-canvas/45 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-heading">{collaboratorName(absence)}</p>
                <p className="truncate text-[11px] text-muted">
                  {shortDate(absence.start_date)} {"->"} {shortDate(absence.end_date)}
                  {absence.notes ? ` · ${absence.notes}` : ""}
                </p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-bold", ABSENCE_TONES[absence.absence_type])}>
                {ABSENCE_LABELS[absence.absence_type]} · {numberFr(absence.duration_days)}j
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-fg/62">{label}</p>
      <p className="mt-1 font-heading text-2xl font-black tracking-tight text-primary-fg">{value}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string
  value: string
  helper: string
  tone: "primary" | "success" | "danger" | "accent"
}) {
  const toneClass = {
    primary: "text-primary bg-primary/10 border-primary/20",
    success: "text-success bg-success/10 border-success/20",
    danger: "text-danger bg-danger/10 border-danger/20",
    accent: "text-accent bg-accent/10 border-accent/20",
  }[tone]

  return (
    <div className={cn("rounded-2xl border bg-surface px-4 py-4", toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-heading text-2xl font-black tracking-tight text-heading">{value}</p>
      <p className="mt-1 text-xs font-medium text-body">{helper}</p>
    </div>
  )
}

function SectionHeader({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 font-heading text-lg font-bold tracking-tight text-heading">{title}</h2>
      </div>
      <p className="max-w-md text-right text-xs leading-5 text-muted">{note}</p>
    </div>
  )
}

function InlineSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums text-heading">{value}</p>
    </div>
  )
}

function ProfitBadge({ value }: { value: number | null | undefined }) {
  const numeric = n(value)
  const tone =
    numeric < 0
      ? "bg-danger text-primary-fg"
      : numeric < 15
        ? "bg-warning text-secondary-fg"
        : "bg-success text-primary-fg"

  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black tabular-nums", tone)}>
      {value === null || value === undefined ? "-" : `${numberFr(value)} %`}
    </span>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-canvas/45 px-4 py-6 text-center text-sm text-muted">
      {label}
    </div>
  )
}
