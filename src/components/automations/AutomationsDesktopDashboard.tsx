"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  DataTable,
  sortDataTableRows,
  type DataTableColumn,
  type DataTableSort,
} from "@/components/ui/data-table/DataTable"
import { createClient } from "@/lib/supabase/client"
import { formatDateTime } from "@/lib/formatters"
import type { AutomationsDashboardData, RunJournalRow, WorkflowHealthRow } from "@/lib/automations/automations-data"
import {
  runStatusVariant,
  runStatusLabel,
  workflowSeverity,
  severityStatusVariant,
  severityLabel,
  formatDurationMs,
  formatCostEstimate,
  formatRelativeTime,
} from "./automations-status"
import { RunDrillDownDialog } from "./RunDrillDownDialog"
import { AutomationsTabs, type AutomationsTabId } from "./AutomationsTabs"
import { CostTimelineChart } from "./CostTimelineChart"
import { VeilleSimulatorCard } from "./VeilleSimulatorCard"

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
    <SurfaceCard padding="compact" className="border-border/50 bg-surface flex flex-col justify-between h-full">
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

function WorkflowHealthCard({ workflow }: { workflow: WorkflowHealthRow }) {
  const severity = workflowSeverity(workflow)
  const stuckTotal = workflow.stuckRunningNow + workflow.stuckQueuedNow

  const dotColorClass = severity === "critical" ? "bg-danger" : severity === "attention" ? "bg-warning" : "bg-success"

  return (
    <SurfaceCard
      accent={severity === "critical" ? "danger" : severity === "attention" ? "warning" : "none"}
      padding="compact"
      className="border-border/60"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/30 pb-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn("inline-flex size-2 rounded-full shrink-0", dotColorClass, severity !== "healthy" && "animate-pulse")} />
            <p className="truncate text-xs font-bold text-heading">{workflow.label}</p>
          </div>
          <p className="mt-0.5 font-mono text-[9px] text-muted tracking-tight truncate">{workflow.runType}</p>
        </div>
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
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

export function AutomationsDesktopDashboard({ data }: { data: AutomationsDashboardData }) {
  const [activeTab, setActiveTab] = useState<AutomationsTabId>("sante")
  const [journal, setJournal] = useState<RunJournalRow[]>(data.journal)
  const [selectedRun, setSelectedRun] = useState<RunJournalRow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sort, setSort] = useState<DataTableSort | null>({ columnId: "createdAt", direction: "desc" })

  // Realtime : les mises à jour de statut d'un run déjà présent dans le journal
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("automations-runs-journal")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ai_intelligence_runs" },
        (payload) => {
          const row = payload.new as { id: string; status: string; error_message: string | null; failed_at: string | null; completed_at: string | null }
          setJournal((current) =>
            current.map((run) =>
              run.id === row.id
                ? { ...run, status: row.status, errorMessage: row.error_message, failedAt: row.failed_at, completedAt: row.completed_at }
                : run
            )
          )
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  const alerts = useMemo(
    () =>
      data.workflows.filter((w) => workflowSeverity(w) !== "healthy").slice(0, 6),
    [data.workflows]
  )

  const costRankedWorkflows = useMemo(
    () =>
      [...data.workflows]
        .filter((w) => !w.hasTokensGap)
        .sort((a, b) => (b.totalCost30d ?? 0) - (a.totalCost30d ?? 0)),
    [data.workflows]
  )
  const maxTotalCost30d = useMemo(
    () => Math.max(...costRankedWorkflows.map((w) => w.totalCost30d ?? 0), 0.01),
    [costRankedWorkflows]
  )

  const columns: DataTableColumn<RunJournalRow>[] = useMemo(() => [
    {
      id: "workflow",
      header: "Workflow",
      cell: (row) => <span className="font-semibold text-heading text-xs">{row.runTypeLabel}</span>,
      sortable: true,
      accessor: (row) => row.runTypeLabel,
    },
    {
      id: "status",
      header: "Statut",
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
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-canvas border border-border/50 text-[9px] font-bold uppercase tracking-wider text-heading">
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
      header: "Déclenché",
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
      header: "Durée",
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
      header: "Coût",
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
      header: "Compte",
      cell: (row) => (
        <span className="text-xs font-medium text-body truncate max-w-[12rem] block">
          {row.companyName ?? "—"}
        </span>
      ),
    },
  ], [])

  const sortedJournal = useMemo(() => sortDataTableRows(journal, columns, sort), [journal, columns, sort])

  const { costs } = data

  const headerTitle = (
    <div className="flex items-center gap-2">
      <span>Monitoring automatisations</span>
      <span className="flex items-center gap-1.5 text-xs text-muted font-normal ml-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
        </span>
        Live Telemetry
      </span>
    </div>
  )

  return (
    <DesktopAnalyticalPage
      title={headerTitle}
      eyebrow=""
      kpis={
        activeTab === "sante" ? (
          <div className="grid grid-cols-4 gap-4">
            <TechKpiCard 
              label="Exécutions (30j)" 
              value={data.kpis.runs30d} 
              subtext="Volume total d'appels n8n + LLM"
            />
            <TechKpiCard
              label="Taux de succès (30j)"
              value={data.kpis.successRatePct30d !== null ? `${data.kpis.successRatePct30d}%` : "—"}
              statusDot={data.kpis.successRatePct30d !== null && data.kpis.successRatePct30d >= 90 ? "success" : "warning"}
              subtext="Moyenne glissante de complétion"
            />
            <TechKpiCard
              label="Runs bloqués"
              value={data.kpis.stuckNow}
              statusDot={data.kpis.stuckNow > 0 ? "warning" : "success"}
              statusDotPulse={data.kpis.stuckNow > 0}
              subtext={data.kpis.stuckNow > 0 ? "Reprise sous 10 min (ops-004)" : "Aucun blocage actif"}
            />
            <TechKpiCard
              label="Runs repris (7j)"
              value={data.kpis.reapedLast7d}
              subtext="Runs interrompus relancés avec succès"
            />
          </div>
        ) : (
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
              subtext={costs.kpis.cost30dDeltaPct === null 
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
      rail={
        activeTab === "sante" ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-heading border-b border-border/40 pb-2 mb-1">Alertes Système</h2>
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-medium)] border border-success/20 bg-success/[0.03] p-3 text-success">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Workflows sains</span>
              </div>
            ) : (
              alerts.map((workflow) => {
                const severity = workflowSeverity(workflow)
                const stuckTotal = workflow.stuckRunningNow + workflow.stuckQueuedNow
                const isCritical = severity === "critical"
                return (
                  <div 
                    key={workflow.runType}
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-[var(--radius-medium)] border-l-4 border bg-surface",
                      isCritical 
                        ? "border-danger/30 border-l-danger" 
                        : "border-warning/30 border-l-warning"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-heading truncate">{workflow.label}</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                        isCritical ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                      )}>
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
              })
            )}
          </div>
        ) : (
          <div className="sticky top-6 flex flex-col gap-3">
            <VeilleSimulatorCard baseline={costs.veilleSimulator} />
          </div>
        )
      }
      lowerContent={
        activeTab === "sante" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2 mb-1">
              <span className="inline-flex size-2 bg-primary rounded-full" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-heading">Journal d&apos;exécution</h2>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/50 bg-surface shadow-sm">
              <DataTable
                rows={sortedJournal}
                columns={columns}
                getRowId={(row) => row.id}
                sort={sort}
                onSortChange={setSort}
                ariaLabel="Journal d'exécution des workflows IA"
                onRowClick={(row) => {
                  setSelectedRun(row)
                  setDialogOpen(true)
                }}
                emptyState={<p className="p-6 text-center text-sm text-muted">Aucune exécution récente.</p>}
              />
            </div>
          </div>
        ) : null
      }
    >
      <div className="mb-5 flex justify-start">
        <AutomationsTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "sante" ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          {data.workflows.map((workflow) => (
            <WorkflowHealthCard key={workflow.runType} workflow={workflow} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <SurfaceCard padding="default" className="border-border/60">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2.5 mb-4">
              <span className="inline-flex size-2 bg-primary rounded-full" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-heading">Coût par jour (60 derniers jours)</h2>
            </div>
            <CostTimelineChart points={costs.timeline} />
          </SurfaceCard>

          <SurfaceCard padding="default" className="border-border/60">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2.5 mb-4">
              <span className="inline-flex size-2 bg-primary rounded-full" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-heading">Coût par workflow (30 derniers jours)</h2>
            </div>
            <div className="flex flex-col gap-1">
              {costRankedWorkflows.map((workflow) => (
                <WorkflowCostBar key={workflow.runType} workflow={workflow} maxCost={maxTotalCost30d} />
              ))}
            </div>
          </SurfaceCard>
        </div>
      )}

      <RunDrillDownDialog
        run={selectedRun}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onRetried={() => setDialogOpen(false)}
      />
    </DesktopAnalyticalPage>
  )
}
