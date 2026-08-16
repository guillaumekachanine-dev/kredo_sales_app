"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { Button } from "@/components/ui/Button"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  DataTable,
  sortDataTableRows,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/ui/data-table/DataTable"
import { formatDateTime } from "@/lib/formatters"
import type { AutomationsDashboardData, RunJournalRow, WorkflowHealthRow } from "@/lib/automations/automations-data"
import {
  runStatusVariant,
  runStatusLabel,
  workflowSeverity,
  severityLabel,
  formatDurationMs,
  formatCostEstimate,
  formatRelativeTime,
} from "./automations-status"
import { RunDrillDownDialog } from "./RunDrillDownDialog"
import { AutomationsLocalNavigation, type AutomationsTabKey } from "./AutomationsLocalNavigation"
import { CostTimelineChart } from "./CostTimelineChart"
import { VeilleSimulatorModal } from "./VeilleSimulatorModal"
import { AutomationsDataErrorBanner } from "./AutomationsDataErrorBanner"
import { JournalLiveStatus } from "./JournalLiveStatus"
import { useRunJournalRealtime } from "./use-run-journal-realtime"

const AutomationMetricsModal = dynamic(
  () => import("@/features/automation-metrics/AutomationMetricsModal").then((module) => module.AutomationMetricsModal),
  { ssr: false },
)

interface TechKpiCardProps {
  label: string
  value: string | number
  subtext?: string
  statusDot?: "success" | "warning" | "danger" | "none"
  statusDotPulse?: boolean
}

function TechKpiCard({ label, value, subtext, statusDot = "none", statusDotPulse = false }: TechKpiCardProps) {
  const dotColorClass = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    none: "",
  }[statusDot]

  return (
    <SurfaceCard padding="compact" className="border-border/50 bg-surface flex flex-col justify-between h-full shadow-2xs">
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-border/20 pb-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
          {statusDot !== "none" && (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              {statusDotPulse && (
                <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", dotColorClass)} />
              )}
              <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColorClass)} />
            </span>
          )}
        </div>
        <p className="font-mono text-2xl font-extrabold text-heading tracking-tight mt-1">{value}</p>
      </div>
      {subtext && (
        <p className="text-[10px] text-muted/70 mt-2 border-t border-border/20 pt-1.5 leading-normal">
          {subtext}
        </p>
      )}
    </SurfaceCard>
  )
}

import { WorkflowExecutionsModal } from "./WorkflowExecutionsModal"

function WorkflowHealthCard({
  workflow,
  onClick,
}: {
  workflow: WorkflowHealthRow
  onClick?: () => void
}) {
  const severity = workflowSeverity(workflow)
  const stuckTotal = workflow.stuckRunningNow + workflow.stuckQueuedNow

  const dotColorClass = severity === "critical" ? "bg-danger" : severity === "attention" ? "bg-warning" : "bg-success"

  return (
    <SurfaceCard
      accent={severity === "critical" ? "danger" : severity === "attention" ? "warning" : "none"}
      padding="compact"
      className={cn(
        "border-border/60 shadow-2xs group transition-all",
        onClick && "cursor-pointer hover:border-brand-brass/60 hover:shadow-md hover:bg-surface-hover/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/30 pb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn("inline-flex size-2 rounded-full shrink-0", dotColorClass, severity !== "healthy" && "animate-pulse")} />
            <p className="truncate text-xs font-bold text-heading group-hover:text-brand-brass transition-colors">{workflow.label}</p>
            {onClick && (
              <svg className="size-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
          <p className="mt-0.5 font-mono text-[9px] text-muted tracking-tight truncate">{workflow.runType}</p>
        </div>
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
          severity === "critical" ? "bg-danger/10 text-danger" : severity === "attention" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
        )}>
          {severityLabel(severity)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-b border-border/30 pb-3 text-left">
        <div>
          <p className="text-[9px] uppercase font-bold tracking-wider text-muted">Succès 30j</p>
          <p className="mt-0.5 font-mono text-sm font-extrabold text-heading">
            {workflow.successRatePct30d !== null ? `${workflow.successRatePct30d}%` : "—"}
          </p>
        </div>
        <div className="border-x border-border/30 px-2.5">
          <p className="text-[9px] uppercase font-bold tracking-wider text-muted">Runs 30j</p>
          <p className="mt-0.5 font-mono text-sm font-extrabold text-heading">{workflow.runs30d}</p>
        </div>
        <div className="pl-1">
          <p className="text-[9px] uppercase font-bold tracking-wider text-muted">p50 Latence</p>
          <p className="mt-0.5 font-mono text-sm font-extrabold text-heading">{formatDurationMs(workflow.p50DurationMs)}</p>
        </div>
      </div>

      {workflow.successRatePct30d !== null && (
        <div className="h-1 w-full bg-canvas rounded-full overflow-hidden mt-3">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-300",
              severity === "critical" ? "bg-danger" : severity === "attention" ? "bg-warning" : "bg-success"
            )}
            style={{ width: `${workflow.successRatePct30d}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] text-muted/80">
        <span>Dernier run : {formatRelativeTime(workflow.lastRunAt)}</span>
        <span>
          {workflow.hasTokensGap
            ? "Coût non mesuré"
            : workflow.avgCost30d !== null
              ? `~${formatCostEstimate(workflow.avgCost30d)} / run`
              : "—"}
        </span>
      </div>

      {stuckTotal > 0 ? (
        <div className="mt-2.5 rounded bg-danger/[0.04] border border-danger/10 px-2 py-1 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-danger animate-pulse shrink-0" />
          <p className="text-[10px] font-semibold text-danger">
            {stuckTotal} run{stuckTotal > 1 ? "s" : ""} bloqué{stuckTotal > 1 ? "s" : ""}
          </p>
        </div>
      ) : null}
    </SurfaceCard>
  )
}

function WorkflowCostBar({ workflow, maxCost }: { workflow: WorkflowHealthRow; maxCost: number }) {
  const widthPct = workflow.totalCost30d !== null && maxCost > 0 ? Math.max(2, (workflow.totalCost30d / maxCost) * 100) : 0

  return (
    <div className="flex flex-col gap-1 py-2 border-b border-border/20 last:border-0 last:pb-0 first:pt-0">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-heading truncate">{workflow.label}</span>
        <span className="font-mono font-bold text-heading shrink-0">
          {workflow.hasTokensGap ? "—" : formatCostEstimate(workflow.totalCost30d)}
        </span>
      </div>
      <div className="h-1.5 w-full bg-canvas rounded-full overflow-hidden mt-0.5">
        {workflow.hasTokensGap ? (
          <div className="h-full bg-muted/20 rounded-full" style={{ width: "100%" }} />
        ) : (
          <div
            className="h-full bg-primary/80 rounded-full transition-all duration-300"
            style={{ width: `${widthPct}%` }}
          />
        )}
      </div>
    </div>
  )
}

export function AutomationsDesktopDashboard({ data, initialRunId }: { data: AutomationsDashboardData; initialRunId?: string }) {
  const initialRun = initialRunId ? data.journal.find((run) => run.id === initialRunId) ?? null : null
  const [activeTab, setActiveTab] = useState<AutomationsTabKey>("journal")
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initialRun?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(Boolean(initialRun))
  const [metricsOpen, setMetricsOpen] = useState(false)
  const [simulatorModalOpen, setSimulatorModalOpen] = useState(false)
  const [selectedWorkflowForModal, setSelectedWorkflowForModal] = useState<{ runType: string; label: string } | null>(null)
  const [sort, setSort] = useState<DataTableSort | null>({ columnId: "createdAt", direction: "desc" })

  // Filtres d'affichage du Journal d'exécution
  const [periodFilter, setPeriodFilter] = useState<"24h" | "7d" | "30d" | "1y" | "all">("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [showAllJournalRows, setShowAllJournalRows] = useState(false)

  // Plage temporelle pour la modale d'exécutions du workflow
  const modalDateRange = useMemo(() => {
    const now = new Date()
    const days = periodFilter === "24h" ? 1 : periodFilter === "7d" ? 7 : periodFilter === "30d" ? 30 : 365
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
    const to = now.toISOString()
    return { from, to }
  }, [periodFilter])

  const periodLabelText = useMemo(() => {
    if (periodFilter === "24h") return "Dernières 24h"
    if (periodFilter === "7d") return "7 derniers jours"
    if (periodFilter === "30d") return "30 derniers jours"
    if (periodFilter === "1y") return "1 an"
    return "30 derniers jours"
  }, [periodFilter])

  // Filtres de période pour la section Coûts
  const [costPeriod, setCostPeriod] = useState<"7d" | "14d" | "30d" | "60d" | "all">("60d")
  const [showAllCostWorkflows, setShowAllCostWorkflows] = useState(false)

  // Realtime Journal
  const { journal, lastUpdatedAt, isRefreshing, refreshError, refresh } = useRunJournalRealtime(
    data.journal,
    data.fetchedAt,
  )

  const selectedRun = useMemo(
    () => (selectedRunId ? journal.find((run) => run.id === selectedRunId) ?? null : null),
    [journal, selectedRunId],
  )

  // Liste des comptes uniques présents dans le journal
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>()
    for (const r of journal) {
      if (r.companyName) set.add(r.companyName)
    }
    return Array.from(set).sort()
  }, [journal])

  // Journal filtré par Période, Statut et Compte
  const filteredJournal = useMemo(() => {
    const now = new Date()
    return journal.filter((row) => {
      // 1. Filtre par période
      if (periodFilter !== "all") {
        const createdDate = new Date(row.createdAt)
        const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 3600)
        if (periodFilter === "24h" && diffHours > 24) return false
        if (periodFilter === "7d" && diffHours > 24 * 7) return false
        if (periodFilter === "30d" && diffHours > 24 * 30) return false
        if (periodFilter === "1y" && diffHours > 24 * 365) return false
      }
      // 2. Filtre par statut
      if (statusFilter !== "all") {
        if (statusFilter === "stuck") {
          if (row.status !== "running" && row.status !== "queued") return false
        } else if (row.status !== statusFilter) {
          return false
        }
      }
      // 3. Filtre par compte
      if (companyFilter !== "all") {
        if (row.companyName !== companyFilter) return false
      }
      return true
    })
  }, [journal, periodFilter, statusFilter, companyFilter])

  // Column definitions with enhanced styling
  const columns: DataTableColumn<RunJournalRow>[] = useMemo(() => [
    {
      id: "workflow",
      header: "WORKFLOW",
      cell: (row) => <span className="font-bold text-heading text-xs">{row.runTypeLabel}</span>,
      sortable: true,
      accessor: (row) => row.runTypeLabel,
    },
    {
      id: "status",
      header: "STATUT",
      cell: (row) => {
        const status = row.status
        const variant = runStatusVariant(status)
        const label = runStatusLabel(status)
        
        const dotColorMap: Record<string, string> = {
          success: "bg-success",
          danger: "bg-danger animate-pulse",
          inProgress: "bg-primary animate-pulse",
          warning: "bg-warning",
          neutral: "bg-muted",
          draft: "bg-muted/60",
        }
        
        return (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-canvas/80 border border-border/50 text-[10px] font-bold uppercase tracking-wider text-heading shadow-2xs">
            <span className={cn("size-1.5 rounded-full shrink-0", dotColorMap[variant] ?? "bg-muted")} />
            {label}
          </div>
        )
      },
      sortable: true,
      accessor: (row) => row.status,
    },
    {
      id: "createdAt",
      header: "DÉCLENCHÉ LE",
      cell: (row) => (
        <span className="font-mono text-xs text-body">
          {formatDateTime(row.createdAt)}
        </span>
      ),
      sortable: true,
      accessor: (row) => new Date(row.createdAt),
    },
    {
      id: "duration",
      header: "DURÉE",
      cell: (row) => (
        <span className="font-mono text-xs text-body font-medium">
          {formatDurationMs(row.durationMs)}
        </span>
      ),
      align: "right",
      sortable: true,
      accessor: (row) => row.durationMs ?? 0,
    },
    {
      id: "cost",
      header: "COÛT ESTIMÉ",
      cell: (row) => (
        <span className="font-mono text-xs text-heading font-bold">
          {row.hasTokensGap ? (
            <span className="text-muted font-normal text-[10px]">incomplet</span>
          ) : row.hasPricingGap ? (
            <span className="text-muted font-normal text-[10px]">non tarifé</span>
          ) : (
            formatCostEstimate(row.costEstimate)
          )}
        </span>
      ),
      align: "right",
    },
    {
      id: "entity",
      header: "COMPTE CIBLÉ",
      cell: (row) => (
        <span className="text-xs font-semibold text-body truncate max-w-[12rem] block">
          {row.companyName ?? "—"}
        </span>
      ),
    },
  ], [])

  const sortedJournal = useMemo(
    () => sortDataTableRows(filteredJournal, columns, sort),
    [filteredJournal, columns, sort],
  )

  // 15 premières exécutions par défaut ou la totalité si affichage étendu
  const displayedJournalRows = useMemo(
    () => (showAllJournalRows ? sortedJournal : sortedJournal.slice(0, 15)),
    [sortedJournal, showAllJournalRows],
  )

  // System alerts (Critical + Warning workflows)
  const alerts = useMemo(
    () => data.workflows.filter((w) => workflowSeverity(w) !== "healthy"),
    [data.workflows]
  )

  // Workflows sains vs sous vigilance
  const healthyWorkflowsCount = useMemo(
    () => data.workflows.filter((w) => workflowSeverity(w) === "healthy").length,
    [data.workflows]
  )

  const attentionWorkflowsCount = useMemo(
    () => data.workflows.filter((w) => workflowSeverity(w) !== "healthy").length,
    [data.workflows]
  )

  // Timeline filtrée par période de coût
  const filteredTimeline = useMemo(() => {
    const { timeline } = data.costs
    if (costPeriod === "all") return timeline

    const now = new Date()
    const daysLimit = costPeriod === "7d" ? 7 : costPeriod === "14d" ? 14 : costPeriod === "30d" ? 30 : 60
    const limitDateIso = new Date(now.getTime() - daysLimit * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return timeline.filter((point) => point.day >= limitDateIso)
  }, [data.costs, costPeriod])

  const costRankedWorkflows = useMemo(
    () =>
      [...data.workflows]
        .filter((w) => !w.hasTokensGap)
        .sort((a, b) => (b.totalCost30d ?? 0) - (a.totalCost30d ?? 0)),
    [data.workflows]
  )

  const displayedCostWorkflows = useMemo(
    () => (showAllCostWorkflows ? costRankedWorkflows : costRankedWorkflows.slice(0, 10)),
    [costRankedWorkflows, showAllCostWorkflows]
  )

  const maxTotalCost30d = useMemo(
    () => Math.max(...costRankedWorkflows.map((w) => w.totalCost30d ?? 0), 0.01),
    [costRankedWorkflows]
  )

  const { costs } = data

  const headerTitle = (
    <div className="flex items-center gap-2">
      <span>Monitoring automatisations</span>
      <span className="flex items-center gap-1.5 text-xs text-muted font-normal ml-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        Live Telemetry
      </span>
    </div>
  )

  // KPI Renderers par onglet
  const renderKpis = () => {
    if (activeTab === "journal") {
      const succeededCount = journal.filter((r) => r.status === "succeeded").length
      const failedOrStuckCount = journal.filter(
        (r) => r.status === "failed" || r.status === "running" || r.status === "queued"
      ).length

      return (
        <div className="grid grid-cols-4 gap-4">
          <TechKpiCard
            label="Exécutions (30j)"
            value={data.kpis.runs30d}
            subtext="Volume total d'appels n8n + LLM"
          />
          <TechKpiCard
            label="Taux de succès"
            value={data.kpis.successRatePct30d !== null ? `${data.kpis.successRatePct30d}%` : "—"}
            statusDot={data.kpis.successRatePct30d !== null && data.kpis.successRatePct30d >= 90 ? "success" : "warning"}
            subtext="Moyenne glissante de complétion"
          />
          <TechKpiCard
            label="Exécutions réussies"
            value={succeededCount}
            statusDot="success"
            subtext="Runs récents terminés avec succès"
          />
          <TechKpiCard
            label="Échecs & Bloqués"
            value={failedOrStuckCount}
            statusDot={failedOrStuckCount > 0 ? "warning" : "success"}
            statusDotPulse={failedOrStuckCount > 0}
            subtext={failedOrStuckCount > 0 ? `${data.kpis.stuckNow} run(s) actuellement bloqué(s)` : "Aucune anomalie bloquante"}
          />
        </div>
      )
    }

    if (activeTab === "sante") {
      return (
        <div className="grid grid-cols-4 gap-4">
          <TechKpiCard
            label="Workflows surveillés"
            value={data.workflows.length}
            subtext={`${healthyWorkflowsCount} sains · ${attentionWorkflowsCount} sous vigilance`}
          />
          <TechKpiCard
            label="Santé globale (30j)"
            value={data.kpis.successRatePct30d !== null ? `${data.kpis.successRatePct30d}%` : "—"}
            statusDot={data.kpis.successRatePct30d !== null && data.kpis.successRatePct30d >= 90 ? "success" : "warning"}
            subtext="Taux moyen de complétion"
          />
          <TechKpiCard
            label="Workflows sous vigilance"
            value={attentionWorkflowsCount}
            statusDot={attentionWorkflowsCount > 0 ? "warning" : "success"}
            statusDotPulse={attentionWorkflowsCount > 0}
            subtext={attentionWorkflowsCount > 0 ? "Alertes système ou taux d'échec élevé" : "Tous les workflows sont fonctionnels"}
          />
          <TechKpiCard
            label="Runs bloqués actuels"
            value={data.kpis.stuckNow}
            statusDot={data.kpis.stuckNow > 0 ? "danger" : "success"}
            statusDotPulse={data.kpis.stuckNow > 0}
            subtext={data.kpis.stuckNow > 0 ? "Reprise auto sous 10 min (ops-004)" : "Aucune file d'attente bloquée"}
          />
        </div>
      )
    }

    // Onglet Coûts
    return (
      <div className="grid grid-cols-4 gap-4">
        <TechKpiCard
          label="Aujourd'hui"
          value={formatCostEstimate(costs.kpis.costToday)}
          subtext="Facturation estimée du jour"
        />
        <TechKpiCard
          label="7 derniers jours"
          value={formatCostEstimate(costs.kpis.cost7d)}
          subtext="Consommation cumulée sur la semaine"
        />
        <TechKpiCard
          label="30 derniers jours"
          value={formatCostEstimate(costs.kpis.cost30d)}
          subtext={
            costs.kpis.cost30dDeltaPct === null
              ? "Historique insuffisant pour un delta"
              : `${costs.kpis.cost30dDeltaPct > 0 ? "Hausse" : "Baisse"} de ${Math.abs(costs.kpis.cost30dDeltaPct)}% vs 30j précédents`
          }
          statusDot={costs.kpis.cost30dDeltaPct !== null && costs.kpis.cost30dDeltaPct > 0 ? "warning" : "none"}
        />
        <TechKpiCard
          label="Cumul total"
          value={formatCostEstimate(costs.kpis.costAllTime)}
          subtext={costs.kpis.dataSince ? `Mesuré depuis le ${new Date(costs.kpis.dataSince).toLocaleDateString("fr-FR")}` : undefined}
        />
      </div>
    )
  }

  return (
    <div data-theme="edito-bright-cockpit" className="edito-bright-page flex h-full min-h-0 min-w-0 overflow-hidden bg-canvas w-full">
      {/* ── Navigation latérale secondaire (Style Cockpit Intelligence / EDITO Bright) ── */}
      <AutomationsLocalNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Contenu principal scrollable ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-canvas">
          <DesktopAnalyticalPage
            title={headerTitle}
            eyebrow=""
            maxWidth="wide"
            actions={
              <div className="flex items-center gap-3">
                {activeTab === "couts" && (
                  <button
                    type="button"
                    onClick={() => setSimulatorModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-edito-brass text-edito-ink text-xs font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Simuler la cadence n8n</span>
                  </button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setMetricsOpen(true)}
                  className="kredo-intelligence-toggle shadow-none cursor-pointer flex items-center gap-2 bg-edito-navy hover:bg-edito-navy/90 text-white"
                >
                  <Image
                    src="/icons_set/agenda_metriques_activite.png"
                    alt=""
                    width={16}
                    height={16}
                    className="w-4 h-4"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                  Analytics
                </Button>
              </div>
            }
            kpis={renderKpis()}
          >
            <AutomationsDataErrorBanner errors={data.dataErrors} />

            {/* ── ONGLET 1 : JOURNAL D'EXÉCUTION ── */}
            {activeTab === "journal" && (
              <div className="flex flex-col gap-4">
                <SurfaceCard padding="default" className="border-border/60 shadow-2xs">
                  {/* Option Bar / Filters */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3 mb-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Filtre par Période */}
                      <label className="flex items-center gap-1.5 text-xs text-muted font-medium">
                        <span>Période :</span>
                        <select
                          value={periodFilter}
                          onChange={(e) => setPeriodFilter(e.target.value as typeof periodFilter)}
                          className="rounded-md border border-border/60 bg-canvas/60 px-2.5 py-1 text-xs text-heading font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="all">Toutes les périodes</option>
                          <option value="24h">Dernières 24 heures</option>
                          <option value="7d">7 derniers jours</option>
                          <option value="30d">30 derniers jours</option>
                          <option value="1y">1 an</option>
                        </select>
                      </label>

                      {/* Filtre par Statut */}
                      <label className="flex items-center gap-1.5 text-xs text-muted font-medium">
                        <span>Statut :</span>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="rounded-md border border-border/60 bg-canvas/60 px-2.5 py-1 text-xs text-heading font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="all">Tous les statuts</option>
                          <option value="succeeded">Réussi</option>
                          <option value="failed">Échec</option>
                          <option value="stuck">Bloqué / En cours</option>
                        </select>
                      </label>

                      {/* Filtre par Compte */}
                      <label className="flex items-center gap-1.5 text-xs text-muted font-medium">
                        <span>Compte :</span>
                        <select
                          value={companyFilter}
                          onChange={(e) => setCompanyFilter(e.target.value)}
                          className="rounded-md border border-border/60 bg-canvas/60 px-2.5 py-1 text-xs text-heading font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-[14rem] truncate"
                        >
                          <option value="all">Tous les comptes</option>
                          {uniqueCompanies.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <JournalLiveStatus
                      lastUpdatedAt={lastUpdatedAt}
                      isRefreshing={isRefreshing}
                      refreshError={refreshError}
                      onRefresh={refresh}
                    />
                  </div>

                  {/* Data Table */}
                  <div className="overflow-hidden rounded-lg border border-border/50 bg-surface">
                    <DataTable
                      rows={displayedJournalRows}
                      columns={columns}
                      getRowId={(row) => row.id}
                      sort={sort}
                      onSortChange={setSort}
                      ariaLabel="Journal d'exécution des workflows IA"
                      onRowClick={(row) => {
                        setSelectedRunId(row.id)
                        setDialogOpen(true)
                      }}
                      emptyState={
                        <p className="p-8 text-center text-xs text-muted">
                          Aucune exécution trouvée correspondant aux filtres sélectionnés.
                        </p>
                      }
                    />
                  </div>

                  {/* Section dépliante pour afficher toutes les exécutions */}
                  {sortedJournal.length > 15 && (
                    <div className="mt-4 flex flex-col items-center justify-center border-t border-border/30 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAllJournalRows(!showAllJournalRows)}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-canvas/80 px-4 py-1.5 text-xs font-bold text-heading hover:bg-surface hover:border-border transition-all cursor-pointer shadow-2xs"
                      >
                        <span>
                          {showAllJournalRows
                            ? "Réduire l'affichage (15 premières exécutions)"
                            : `Afficher toutes les exécutions (${sortedJournal.length} au total)`}
                        </span>
                        <svg
                          className={`size-3.5 transition-transform ${showAllJournalRows ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </SurfaceCard>
              </div>
            )}

            {/* ── ONGLET 2 : SANTÉ DES WORKFLOWS ── */}
            {activeTab === "sante" && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                {/* Section gauche : Grille des workflows */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    <span className="inline-flex size-2 bg-primary rounded-full" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-heading">
                      Santé des workflows ({data.workflows.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.workflows.map((workflow) => (
                      <WorkflowHealthCard
                        key={workflow.runType}
                        workflow={workflow}
                        onClick={() => setSelectedWorkflowForModal({ runType: workflow.runType, label: workflow.label })}
                      />
                    ))}
                  </div>
                </div>

                {/* Section droite : Alertes système */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    <span className="inline-flex size-2 bg-danger rounded-full animate-pulse" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-heading">
                      Alertes système ({alerts.length})
                    </h2>
                  </div>

                  {alerts.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg border border-success/20 bg-success/[0.04] p-4 text-success shadow-2xs">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Tous les workflows sont sains
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {alerts.map((workflow) => {
                        const severity = workflowSeverity(workflow)
                        const stuckTotal = workflow.stuckRunningNow + workflow.stuckQueuedNow
                        const isCritical = severity === "critical"
                        return (
                          <div
                            key={workflow.runType}
                            onClick={() => setSelectedWorkflowForModal({ runType: workflow.runType, label: workflow.label })}
                            className={cn(
                              "flex flex-col gap-1.5 p-3.5 rounded-lg border-l-4 border bg-surface shadow-2xs cursor-pointer hover:bg-surface-hover/60 hover:shadow-md transition-all group",
                              isCritical
                                ? "border-danger/30 border-l-danger"
                                : "border-warning/30 border-l-warning",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-heading truncate group-hover:text-brand-brass transition-colors">{workflow.label}</span>
                              <span
                                className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                  isCritical ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning",
                                )}
                              >
                                {isCritical ? "Critique" : "Alerte"}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted leading-normal">
                              {stuckTotal > 0
                                ? `${stuckTotal} run(s) bloqué(s) (reprise auto)`
                                : `Taux succès 30j : ${workflow.successRatePct30d ?? "—"}%`}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ONGLET 3 : COÛTS ── */}
            {activeTab === "couts" && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Section Gauche : Graphique Coûts par jour */}
                <SurfaceCard padding="default" className="border-border/60 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-2 bg-primary rounded-full" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-heading">Coûts par jour</h2>
                    </div>

                    {/* Sélecteur de période */}
                    <div className="flex items-center gap-1.5 text-xs text-muted font-medium">
                      <span>Période :</span>
                      <select
                        value={costPeriod}
                        onChange={(e) => setCostPeriod(e.target.value as typeof costPeriod)}
                        className="rounded-md border border-border/60 bg-canvas/60 px-2 py-0.5 text-xs text-heading font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="7d">7 jours</option>
                        <option value="14d">14 jours</option>
                        <option value="30d">30 jours</option>
                        <option value="60d">60 jours</option>
                        <option value="all">Historique complet</option>
                      </select>
                    </div>
                  </div>
                  <CostTimelineChart points={filteredTimeline} />
                </SurfaceCard>

                {/* Section Droite : Coûts par workflow */}
                <SurfaceCard padding="default" className="border-border/60 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-2 bg-primary rounded-full" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-heading">Coûts par workflow</h2>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    {displayedCostWorkflows.map((workflow) => (
                      <WorkflowCostBar key={workflow.runType} workflow={workflow} maxCost={maxTotalCost30d} />
                    ))}
                  </div>

                  {/* Section déroulante pour afficher tous les workflows de coût */}
                  {costRankedWorkflows.length > 10 && (
                    <div className="mt-4 flex flex-col items-center justify-center border-t border-border/30 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowAllCostWorkflows(!showAllCostWorkflows)}
                        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-canvas/80 px-4 py-1.5 text-xs font-bold text-heading hover:bg-surface hover:border-border transition-all cursor-pointer shadow-2xs"
                      >
                        <span>
                          {showAllCostWorkflows
                            ? "Réduire l'affichage (10 premiers workflows)"
                            : `Afficher tous les workflows (${costRankedWorkflows.length} au total)`}
                        </span>
                        <svg
                          className={`size-3.5 transition-transform ${showAllCostWorkflows ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </SurfaceCard>
              </div>
            )}
          </DesktopAnalyticalPage>
        </main>
      </div>

      {/* ── Dialogues & Modales ── */}
      <RunDrillDownDialog
        run={selectedRun}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onRetried={() => setDialogOpen(false)}
      />
      <WorkflowExecutionsModal
        open={selectedWorkflowForModal !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedWorkflowForModal(null)
        }}
        workflowId={selectedWorkflowForModal?.runType ?? null}
        workflowLabel={selectedWorkflowForModal?.label ?? null}
        periodLabel={periodLabelText}
        dateRange={modalDateRange}
        initialRuns={journal}
      />
      {metricsOpen ? (
        <AutomationMetricsModal open={metricsOpen} onClose={() => setMetricsOpen(false)} displayMode="desktop" />
      ) : null}
      <VeilleSimulatorModal
        open={simulatorModalOpen}
        onClose={() => setSimulatorModalOpen(false)}
        baseline={costs.veilleSimulator}
      />
    </div>
  )
}
