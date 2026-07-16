"use client"

import { useState, type ReactNode } from "react"
import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import { FinancialReferenceDesktopCard } from "@/components/finance/FinancialReferenceDesktopCard"
import { StatusPill } from "@/components/ui/StatusPill"
import { formatDateNumeric, formatEuro, formatPct } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { MissionDetailViewModel } from "./mission-detail-types"
import {
  buildCraAlerts,
  computeRealMarginPct,
  computeTheoreticalMarginPct,
  computeTotalBillableDays,
  computeTotalRevenue,
  getCollaboratorName,
  getPeriodLabel,
  parseDateOnly,
} from "./mission-detail-utils"

interface MissionOverviewDesktopProps {
  vm: MissionDetailViewModel
}

type MissionStepId = "scope" | "collaborator" | "financial" | "actual"

const MISSION_STEPS: Array<{ id: MissionStepId; shortLabel: string; label: string }> = [
  { id: "scope", shortLabel: "Poste", label: "Cadre de mission" },
  { id: "collaborator", shortLabel: "Collaborateur", label: "Collaborateur en mission" },
  { id: "financial", shortLabel: "Économie", label: "Conditions financières" },
  { id: "actual", shortLabel: "Réel", label: "Activité et rentabilité réelle" },
]

const STATUS_MAP: Record<string, { label: string; variant: "success" | "neutral" | "danger" | "inProgress" }> = {
  active: { label: "En cours", variant: "success" },
  paused: { label: "Suspendue", variant: "neutral" },
  ended: { label: "Terminée", variant: "neutral" },
  cancelled: { label: "Annulée", variant: "danger" },
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function getEstimatedBusinessDays(startDate: string | null, endDate: string | null) {
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  if (!start || !end || end <= start) return null
  const calendarDays = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return Math.round((calendarDays * 5) / 7)
}

function getCalendarProgress(startDate: string | null, endDate: string | null) {
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  if (!start || !end || end <= start) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.min(100, Math.max(0, ((today.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100))
}

function DetailLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(8rem,0.75fr)_minmax(0,1.25fr)] gap-5 border-b border-border/80 py-2.5 last:border-b-0">
      <dt className="text-xs font-medium text-primary">{label}</dt>
      <dd className="min-w-0 text-xs font-semibold text-heading">{value}</dd>
    </div>
  )
}

function FinancialMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-xs text-body">{label}</span>
      <span className="text-right font-mono text-sm font-semibold tabular-nums text-heading">
        {value}
        {hint ? <span className="ml-1.5 font-sans text-[10px] font-normal text-muted">{hint}</span> : null}
      </span>
    </div>
  )
}

function ProgressTrack({ label, detail, value, tone = "primary" }: { label: string; detail: string; value: number; tone?: "primary" | "warning" }) {
  const pct = Math.max(0, Math.min(100, value))

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-semibold text-heading">{label}</span>
        <span className="text-xs tabular-nums text-body">{detail}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border/80">
        <div className={cn("h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none", tone === "warning" ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

interface MarginTrendChartProps {
  points: Array<{ id: string; label: string; value: number | null }>
  target: number | null
}

function MarginTrendChart({ points, target }: MarginTrendChartProps) {
  const usablePoints = points.filter((point): point is { id: string; label: string; value: number } => point.value !== null)
  const values = usablePoints.map((point) => point.value)
  const chartMin = Math.min(25, ...(values.length ? values : [25]), target ?? 25)
  const chartMax = Math.max(50, ...(values.length ? values : [50]), target ?? 50)
  const chartRange = Math.max(1, chartMax - chartMin)
  const xForIndex = (index: number) => (usablePoints.length <= 1 ? 50 : 50 + (index * 320) / (usablePoints.length - 1))
  const yForValue = (value: number) => 88 - ((value - chartMin) / chartRange) * 58
  const path = usablePoints.map((point, index) => `${index === 0 ? "M" : "L"}${xForIndex(index)} ${yForValue(point.value)}`).join(" ")
  const targetY = target === null ? null : yForValue(target)

  if (usablePoints.length === 0) return <p className="mt-5 text-xs text-muted">Aucun CRA disponible pour établir une tendance.</p>

  return (
    <div className="mt-4">
      <svg viewBox="0 0 420 126" className="h-auto w-full" role="img" aria-label="Évolution mensuelle du taux de marge réelle">
        <line x1="40" x2="390" y1="88" y2="88" stroke="currentColor" className="text-border" strokeWidth="1" />
        <line x1="40" x2="390" y1="30" y2="30" stroke="currentColor" className="text-border/70" strokeWidth="1" />
        {targetY !== null ? <line x1="40" x2="390" y1={targetY} y2={targetY} stroke="currentColor" className="text-primary" strokeDasharray="4 4" strokeWidth="1.5" /> : null}
        <path d={path} fill="none" stroke="currentColor" className="text-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {usablePoints.map((point, index) => (
          <g key={point.id}>
            <circle cx={xForIndex(index)} cy={yForValue(point.value)} r="3.5" fill="currentColor" className="text-primary" />
            <text x={xForIndex(index)} y="112" textAnchor="middle" className="fill-muted text-[10px]">{point.label}</text>
          </g>
        ))}
        <text x="0" y="34" className="fill-muted text-[10px]">{formatPct(chartMax)}</text>
        <text x="0" y="92" className="fill-muted text-[10px]">{formatPct(chartMin)}</text>
      </svg>
    </div>
  )
}

export function MissionOverviewDesktop({ vm }: MissionOverviewDesktopProps) {
  const [activeStep, setActiveStep] = useState<MissionStepId>("scope")
  const { mission, company, collaborator, activityReports } = vm
  const meta = (mission.metadata || {}) as Record<string, unknown>
  const collaboratorName = getCollaboratorName(collaborator?.person ?? null)
  const collaboratorInitials = getInitials(collaboratorName)
  const statusInfo = STATUS_MAP[mission.status] ?? { label: mission.status, variant: "neutral" as const }
  const estimatedDays = getEstimatedBusinessDays(mission.start_date, mission.end_date)
  const calendarProgress = getCalendarProgress(mission.start_date, mission.end_date)
  const billableDays = computeTotalBillableDays(activityReports)
  const revenueActual = computeTotalRevenue(activityReports)
  const costActual = activityReports.reduce((sum, report) => sum + report.billable_days * report.cjm_snapshot, 0)
  const marginActual = revenueActual - costActual
  const marginActualPct = computeRealMarginPct(activityReports)
  const marginTargetPct = computeTheoreticalMarginPct(mission)
  const revenueEstimated = estimatedDays === null ? null : estimatedDays * mission.tjm
  const costEstimated = estimatedDays === null ? null : estimatedDays * mission.cjm
  const marginEstimated = revenueEstimated === null || costEstimated === null ? null : revenueEstimated - costEstimated
  const activityProgress = estimatedDays && estimatedDays > 0 ? (billableDays / estimatedDays) * 100 : null
  const trajectoryGap = activityProgress !== null && calendarProgress !== null ? activityProgress - calendarProgress : null
  const alerts = buildCraAlerts(activityReports)
  const description = mission.description || (meta.description as string) || null
  const billingCondition = mission.billing_condition || (meta.payment_terms as string) || null
  const companyName = company?.name ?? "Compte non renseigné"
  const logoPath = typeof company?.metadata === "object" && company?.metadata && "logo_path" in company.metadata && typeof company.metadata.logo_path === "string"
    ? company.metadata.logo_path
    : null
  const marginTrend = [...activityReports]
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .slice(-6)
    .map((report) => {
      const revenue = report.billable_days * report.tjm_snapshot
      const cost = report.billable_days * report.cjm_snapshot
      return {
        id: report.id,
        label: getPeriodLabel(report.period_start).slice(0, 4).replace(".", ""),
        value: revenue > 0 ? ((revenue - cost) / revenue) * 100 : null,
      }
    })
  const comparisonRows = [
    { label: "Jours", estimated: estimatedDays === null ? "—" : `${estimatedDays} jours`, actual: `${billableDays} jours` },
    { label: "CA", estimated: formatEuro(revenueEstimated), actual: formatEuro(revenueActual) },
    { label: "Coût", estimated: formatEuro(costEstimated), actual: formatEuro(costActual) },
    { label: "Marge brute", estimated: formatEuro(marginEstimated), actual: formatEuro(marginActual) },
  ]

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto w-full max-w-[1360px] px-7 pb-12 pt-5">
        <header className="border-b border-border pb-5">
          <div className="flex items-start justify-between gap-8">
            <div className="min-w-0">
              <p className="text-xs text-muted">Engagements <span className="mx-1.5 text-border">/</span> Missions <span className="mx-1.5 text-border">/</span> <span className="font-medium text-primary">{mission.title}</span></p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Mission</span>
                {mission.external_ref ? <span className="font-mono text-[11px] text-muted">{mission.external_ref}</span> : null}
                <span className="h-4 w-px bg-border" />
                <span className="font-heading text-lg font-bold tracking-tight text-heading">{mission.title}</span>
                <span className="h-4 w-px bg-border" />
                <StatusPill label={statusInfo.label} variant={statusInfo.variant} />
              </div>
            </div>
            <div className="shrink-0 text-right text-xs text-body">
              <p>{mission.start_date ? formatDateNumeric(mission.start_date) : "Date de début non renseignée"}</p>
              <p className="mt-1 text-muted">{mission.end_date ? `jusqu’au ${formatDateNumeric(mission.end_date)}` : "Fin non renseignée"}</p>
            </div>
          </div>
        </header>

        <nav aria-label="Étapes de la mission" role="tablist" className="mx-auto mt-8 grid max-w-5xl grid-cols-4 items-center">
          {MISSION_STEPS.map((step, index) => (
            <div key={step.id} className="relative flex min-w-0 items-center last:justify-end">
              <button
                id={`mission-step-${step.id}`}
                type="button"
                role="tab"
                aria-selected={activeStep === step.id}
                aria-controls="mission-step-content"
                onClick={() => setActiveStep(step.id)}
                className={cn(
                  "group kredo-timeline-tab relative z-10 inline-flex items-center gap-2 bg-canvas pr-3 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F9CCB]/40",
                  activeStep === step.id ? "text-[#5876A6]" : "text-body hover:text-heading",
                )}
              >
                <span className={cn("kredo-timeline-step kredo-timeline-step--cool flex size-8 items-center justify-center rounded-full border text-sm font-medium", activeStep === step.id ? "border-[#7F9CCB] bg-[#7F9CCB] text-white" : "border-[#C8D7E9] bg-canvas text-body")}>
                  <span className="relative z-10">{index + 1}</span>
                </span>
                <span className="kredo-timeline-step-label whitespace-nowrap">{step.shortLabel}</span>
              </button>
              {index < MISSION_STEPS.length - 1 ? <span aria-hidden className="absolute left-8 right-0 h-px bg-[#C8D7E9]" /> : null}
            </div>
          ))}
        </nav>

        <main id="mission-step-content" role="tabpanel" aria-labelledby={`mission-step-${activeStep}`} className="mt-8 min-h-[31rem] border-t border-border pt-7">
          {activeStep === "scope" ? (
            <section key="scope" className="animate-fade-in motion-reduce:animate-none">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">01 — Poste</p>
              <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-heading">Cadre de mission</h1>
              <div className="mt-8 grid gap-12 xl:grid-cols-[minmax(0,1.04fr)_minmax(22rem,0.96fr)]">
                <div>
                  <h2 className="font-heading text-base font-bold text-heading">Détails du poste</h2>
                  <p className="mt-3 max-w-[58ch] text-sm leading-6 text-body">{description ?? "Aucune description de mission n’est renseignée."}</p>
                  <dl className="mt-6 max-w-xl">
                    <DetailLine label="Fonction" value={mission.role_title ?? "—"} />
                    <DetailLine label="Practice" value={mission.practice ?? collaborator?.practice ?? "—"} />
                    <DetailLine label="Séniorité" value={mission.seniority ?? collaborator?.seniority ?? "—"} />
                    <DetailLine label="Période" value={`${mission.start_date ? formatDateNumeric(mission.start_date) : "—"} — ${mission.end_date ? formatDateNumeric(mission.end_date) : "—"}`} />
                    {billingCondition ? <DetailLine label="Conditions de facturation" value={billingCondition} /> : null}
                  </dl>
                </div>
                <div className="border-l border-border pl-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Compte associé</p>
                  <div className="mt-5 flex items-center gap-4">
                    <CompanyLogo name={companyName} logoPath={logoPath} website={company?.website ?? null} size="lg" denseList />
                    <div>
                      <p className="font-heading text-xl font-bold tracking-tight text-heading">{companyName}</p>
                      <p className="mt-1 text-sm text-body">{company?.segment ?? "Compte client"}</p>
                    </div>
                  </div>
                  <dl className="mt-8 max-w-md">
                    <DetailLine label="Secteur" value={company?.sector ?? "—"} />
                    <DetailLine label="Siège" value={company?.hq_location ?? "—"} />
                    <DetailLine label="Collaborateur" value={collaboratorName} />
                  </dl>
                </div>
              </div>
            </section>
          ) : null}

          {activeStep === "collaborator" ? (
            <section key="collaborator" className="animate-fade-in motion-reduce:animate-none">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">02 — Collaborateur</p>
              <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-heading">Collaborateur en mission</h1>
              {collaborator ? (
                <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(17rem,0.72fr)_minmax(20rem,0.88fr)_minmax(18rem,0.9fr)]">
                  <div className="flex items-center gap-5 border-r border-border pr-8">
                    <div className="flex size-28 shrink-0 items-center justify-center rounded-full bg-primary/[0.09] font-heading text-4xl font-bold text-primary">{collaboratorInitials}</div>
                    <div className="min-w-0">
                      <p className="font-heading text-xl font-bold tracking-tight text-heading">{collaboratorName}</p>
                      <p className="mt-1 text-sm text-body">{collaborator.current_title ?? mission.role_title ?? "Profil non renseigné"}</p>
                      <p className="mt-3 text-xs font-medium text-primary">{collaborator.seniority ?? mission.seniority ?? "Séniorité non renseignée"}</p>
                    </div>
                  </div>
                  <div className="border-r border-border pr-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Repères d’affectation</p>
                    <dl className="mt-4">
                      <DetailLine label="Practice" value={collaborator.practice ?? mission.practice ?? "—"} />
                      <DetailLine label="Début de mission" value={mission.start_date ? formatDateNumeric(mission.start_date) : "—"} />
                      <DetailLine label="Statut" value={collaborator.status ?? "—"} />
                      {collaborator.availability ? <DetailLine label="Disponibilité" value={collaborator.availability} /> : null}
                    </dl>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Compétences principales</p>
                    {collaborator.skills.length > 0 ? (
                      <div className="mt-4 flex max-w-sm flex-wrap gap-2">
                        {collaborator.skills.slice(0, 8).map((skill) => <span key={skill.id} className="rounded-[var(--radius-small)] border border-primary/20 bg-primary/[0.04] px-2.5 py-1.5 text-xs font-medium text-primary">{skill.skill.name}</span>)}
                      </div>
                    ) : <p className="mt-4 text-sm text-muted">Aucune compétence renseignée.</p>}
                    {collaborator.employee_ref ? <p className="mt-9 border-t border-border pt-4 text-xs text-muted">Référence interne <span className="ml-2 font-mono font-medium text-heading">{collaborator.employee_ref}</span></p> : null}
                  </div>
                </div>
              ) : <p className="mt-8 text-sm text-muted">Aucun collaborateur associé à cette mission.</p>}
            </section>
          ) : null}

          {activeStep === "financial" ? (
            <section key="financial" className="animate-fade-in motion-reduce:animate-none">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">03 — Économie</p>
              <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-heading">Conditions financières</h1>
              {vm.financialReference ? <div className="mt-6"><FinancialReferenceDesktopCard reference={vm.financialReference} /></div> : null}
              <div className="mt-8 grid divide-x divide-border md:grid-cols-3">
                <div className="pr-9">
                  <p className="text-sm font-bold text-primary">Vente</p>
                  <div className="mt-4"><FinancialMetric label="TJM client" value={formatEuro(mission.tjm)} /><FinancialMetric label="CA prévisionnel" value={formatEuro(revenueEstimated)} hint={estimatedDays === null ? undefined : `${estimatedDays} j estimés`} /></div>
                </div>
                <div className="px-9">
                  <p className="text-sm font-bold text-primary">Coût</p>
                  <div className="mt-4"><FinancialMetric label="CJM" value={formatEuro(mission.cjm)} /><FinancialMetric label="Coût prévisionnel" value={formatEuro(costEstimated)} /></div>
                </div>
                <div className="pl-9">
                  <p className="text-sm font-bold text-primary">Marge</p>
                  <div className="mt-4"><FinancialMetric label="Marge unitaire" value={formatEuro(mission.tjm - mission.cjm)} /><FinancialMetric label="Marge brute prévisionnelle" value={formatEuro(marginEstimated)} /><FinancialMetric label="Cible de marge" value={formatPct(marginTargetPct)} /></div>
                </div>
              </div>
              <div className="mt-10 border-t border-border pt-5">
                <p className="text-xs font-medium text-muted">Conditions de facturation</p>
                <p className="mt-2 text-sm text-body">{billingCondition ?? "Aucune condition de facturation renseignée."}</p>
              </div>
            </section>
          ) : null}

          {activeStep === "actual" ? (
            <section key="actual" className="animate-fade-in motion-reduce:animate-none">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">04 — Réel</p>
              <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight text-heading">Activité et rentabilité réelle</h1>
              <div className="mt-8 grid gap-9 xl:grid-cols-[minmax(16rem,0.72fr)_minmax(23rem,1.08fr)]">
                <div className="border-r border-border pr-9">
                  <p className="font-heading text-base font-bold text-heading">Activité</p>
                  <div className="mt-5 space-y-7">
                    <ProgressTrack label="Jours facturables" detail={estimatedDays === null ? `${billableDays} jours` : `${billableDays} / ${estimatedDays} jours`} value={activityProgress ?? 0} />
                    {calendarProgress !== null ? <ProgressTrack label="Calendrier écoulé" detail={`${Math.round(calendarProgress)} %`} value={calendarProgress} tone="warning" /> : null}
                  </div>
                  {trajectoryGap !== null && trajectoryGap < -2 ? <p className="mt-8 border-l-2 border-warning pl-3 text-xs leading-5 text-[var(--color-status-warning-ink)]">L’activité est en retrait de {Math.abs(Math.round(trajectoryGap))} points par rapport au calendrier.</p> : null}
                  {alerts[0] ? <p className="mt-4 border-l-2 border-warning pl-3 text-xs leading-5 text-[var(--color-status-warning-ink)]">{alerts[0].message}</p> : null}
                </div>
                <div>
                  <div className="grid grid-cols-[minmax(6rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)] border-b border-border pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary"><span>Indicateur</span><span className="text-right">Prévu</span><span className="text-right">Réalisé</span></div>
                  <dl>{comparisonRows.map((row) => <div key={row.label} className="grid grid-cols-[minmax(6rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)] border-b border-border/70 py-3 text-xs"><dt className="font-medium text-body">{row.label}</dt><dd className="text-right font-mono tabular-nums text-heading">{row.estimated}</dd><dd className="text-right font-mono font-semibold tabular-nums text-heading">{row.actual}</dd></div>)}<div className="grid grid-cols-[minmax(6rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)] pt-3 text-xs"><dt className="font-medium text-body">Taux de marge</dt><dd className="text-right font-mono tabular-nums text-heading">{formatPct(marginTargetPct)}</dd><dd className="text-right font-mono font-semibold tabular-nums text-heading">{formatPct(marginActualPct)}</dd></div></dl>
                  <div className="mt-10 border-t border-border pt-5">
                    <div className="flex items-baseline justify-between gap-4"><p className="font-heading text-base font-bold text-heading">Taux de marge réel</p><p className="text-[10px] text-muted">plein : réel <span className="mx-1 text-border">·</span> pointillé : cible</p></div>
                    <MarginTrendChart points={marginTrend} target={marginTargetPct} />
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  )
}
