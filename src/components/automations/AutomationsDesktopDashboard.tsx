"use client"

import { useEffect, useMemo, useState } from "react"
import { DesktopAnalyticalPage } from "@/components/templates/DesktopAnalyticalPage"
import { KpiCard } from "@/components/ui/KpiCard"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { AlertBlock } from "@/components/ui/AlertBlock"
import { StatusPill } from "@/components/ui/StatusPill"
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

function WorkflowHealthCard({ workflow }: { workflow: WorkflowHealthRow }) {
  const severity = workflowSeverity(workflow)
  const stuckTotal = workflow.stuckRunningNow + workflow.stuckQueuedNow

  return (
    <SurfaceCard
      accent={severity === "critical" ? "danger" : severity === "attention" ? "warning" : "none"}
      padding="default"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-heading">{workflow.label}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">{workflow.runType}</p>
        </div>
        <StatusPill label={severityLabel(severity)} variant={severityStatusVariant(severity)} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-heading">
            {workflow.successRatePct30d !== null ? `${workflow.successRatePct30d}%` : "—"}
          </p>
          <p className="text-[11px] text-muted">Succès 30j</p>
        </div>
        <div>
          <p className="text-lg font-bold text-heading">{workflow.runs30d}</p>
          <p className="text-[11px] text-muted">Runs 30j</p>
        </div>
        <div>
          <p className="text-lg font-bold text-heading">{formatDurationMs(workflow.p50DurationMs)}</p>
          <p className="text-[11px] text-muted">p50</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted">
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
        <p className="mt-2 text-xs font-medium text-danger">
          {stuckTotal} run{stuckTotal > 1 ? "s" : ""} actuellement bloqué{stuckTotal > 1 ? "s" : ""}
        </p>
      ) : null}
    </SurfaceCard>
  )
}

function WorkflowCostBar({ workflow, maxCost }: { workflow: WorkflowHealthRow; maxCost: number }) {
  const widthPct = workflow.totalCost30d !== null && maxCost > 0 ? Math.max(2, (workflow.totalCost30d / maxCost) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <p className="w-48 shrink-0 truncate text-xs text-body">{workflow.label}</p>
      <div className="h-6 flex-1 overflow-hidden rounded-[var(--radius-small)] bg-canvas">
        {workflow.hasTokensGap ? (
          <div className="flex h-full items-center px-2 text-[10px] text-muted">Coût non mesuré</div>
        ) : (
          <div
            className="flex h-full items-center justify-end bg-[var(--color-dataviz-1)] px-2 opacity-80"
            style={{ width: `${widthPct}%` }}
          />
        )}
      </div>
      <p className="w-20 shrink-0 text-right text-xs font-medium text-heading">
        {workflow.hasTokensGap ? "—" : formatCostEstimate(workflow.totalCost30d)}
      </p>
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
  // (queued→running→succeeded/failed) sont reflétées en place — pas de refetch
  // complet de la page à chaque transition.
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
      cell: (row) => <span className="font-medium text-heading">{row.runTypeLabel}</span>,
      sortable: true,
      accessor: (row) => row.runTypeLabel,
    },
    {
      id: "status",
      header: "Statut",
      cell: (row) => <StatusPill label={runStatusLabel(row.status)} variant={runStatusVariant(row.status)} />,
      sortable: true,
      accessor: (row) => row.status,
    },
    {
      id: "createdAt",
      header: "Déclenché",
      cell: (row) => formatDateTime(row.createdAt),
      sortable: true,
      accessor: (row) => new Date(row.createdAt),
    },
    {
      id: "duration",
      header: "Durée",
      cell: (row) => formatDurationMs(row.durationMs),
      align: "right",
      sortable: true,
      accessor: (row) => row.durationMs ?? 0,
    },
    {
      id: "cost",
      header: "Coût",
      cell: (row) =>
        row.hasTokensGap ? (
          <span className="text-muted">callback incomplet</span>
        ) : row.hasPricingGap ? (
          <span className="text-muted">non tarifé</span>
        ) : (
          formatCostEstimate(row.costEstimate)
        ),
      align: "right",
    },
    {
      id: "entity",
      header: "Compte",
      cell: (row) => row.companyName ?? "—",
    },
  ], [])

  const sortedJournal = useMemo(() => sortDataTableRows(journal, columns, sort), [journal, columns, sort])

  const { costs } = data

  return (
    <DesktopAnalyticalPage
      title="Automatisations"
      eyebrow="Santé & exécution IA"
      kpis={
        activeTab === "sante" ? (
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="Exécutions (30j)" value={data.kpis.runs30d} />
            <KpiCard
              label="Taux de succès (30j)"
              value={data.kpis.successRatePct30d !== null ? `${data.kpis.successRatePct30d}%` : "—"}
            />
            <KpiCard
              label="Runs bloqués"
              value={data.kpis.stuckNow}
              accent={data.kpis.stuckNow > 0 ? "brass" : "none"}
              context={data.kpis.stuckNow > 0 ? "Repris automatiquement sous 10 min (ops-004)" : "Aucun run bloqué"}
            />
            <KpiCard
              label="Runs repris (7j)"
              value={data.kpis.reapedLast7d}
              context="Notifiés in-app à leur propriétaire"
            />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="Aujourd'hui" value={formatCostEstimate(costs.kpis.costToday)} />
            <KpiCard label="7 derniers jours" value={formatCostEstimate(costs.kpis.cost7d)} />
            <KpiCard
              label="30 derniers jours"
              value={formatCostEstimate(costs.kpis.cost30d)}
              delta={costs.kpis.cost30dDeltaPct !== null ? `${costs.kpis.cost30dDeltaPct > 0 ? "+" : ""}${costs.kpis.cost30dDeltaPct}%` : undefined}
              deltaTone={costs.kpis.cost30dDeltaPct === null ? "neutral" : costs.kpis.cost30dDeltaPct > 0 ? "negative" : "positive"}
              context={costs.kpis.cost30dDeltaPct === null ? "Historique insuffisant pour un delta" : "vs. 30 jours précédents"}
            />
            <KpiCard
              label="Cumul total"
              value={formatCostEstimate(costs.kpis.costAllTime)}
              context={costs.kpis.dataSince ? `Depuis le ${new Date(costs.kpis.dataSince).toLocaleDateString("fr-FR")}` : undefined}
            />
          </div>
        )
      }
      rail={
        activeTab === "sante" ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-heading">Alertes</h2>
            {alerts.length === 0 ? (
              <AlertBlock variant="success" title="Tous les workflows sont sains" />
            ) : (
              alerts.map((workflow) => {
                const severity = workflowSeverity(workflow)
                const stuckTotal = workflow.stuckRunningNow + workflow.stuckQueuedNow
                return (
                  <AlertBlock
                    key={workflow.runType}
                    variant={severity === "critical" ? "danger" : "warning"}
                    title={workflow.label}
                    description={
                      stuckTotal > 0
                        ? `${stuckTotal} run(s) actuellement bloqué(s)`
                        : `Taux de succès 30j : ${workflow.successRatePct30d ?? "—"}%`
                    }
                  />
                )
              })
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-heading">Coût par utilisateur</h2>
            {costs.byOwner.length === 0 ? (
              <p className="text-sm text-muted">Aucune donnée sur la période.</p>
            ) : (
              costs.byOwner.map((owner) => (
                <SurfaceCard key={owner.ownerName} padding="compact">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-body">{owner.ownerName}</p>
                    <p className="text-sm font-semibold text-heading">{formatCostEstimate(owner.costEstimate)}</p>
                  </div>
                  <p className="text-[11px] text-muted">{owner.runs} run(s)</p>
                </SurfaceCard>
              ))
            )}
          </div>
        )
      }
      lowerContent={
        activeTab === "sante" ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-heading">Journal d&apos;exécution</h2>
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
        ) : null
      }
    >
      <AutomationsTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "sante" ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
          {data.workflows.map((workflow) => (
            <WorkflowHealthCard key={workflow.runType} workflow={workflow} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <SurfaceCard padding="default">
            <h2 className="mb-3 text-sm font-semibold text-heading">Coût par jour (60 derniers jours)</h2>
            <CostTimelineChart points={costs.timeline} />
          </SurfaceCard>

          <SurfaceCard padding="default">
            <h2 className="mb-4 text-sm font-semibold text-heading">Coût par workflow (30 derniers jours)</h2>
            <div className="flex flex-col gap-2.5">
              {costRankedWorkflows.map((workflow) => (
                <WorkflowCostBar key={workflow.runType} workflow={workflow} maxCost={maxTotalCost30d} />
              ))}
            </div>
          </SurfaceCard>

          <VeilleSimulatorCard baseline={costs.veilleSimulator} />
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
