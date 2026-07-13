"use client"

import { useState } from "react"
import { MobileActionPage } from "@/components/templates/MobileActionPage"
import { MobilePageHeader } from "@/components/ui/mobile/MobilePageHeader"
import { MobileHeroInsight } from "@/components/ui/mobile/MobileHeroInsight"
import { MobileActionCard } from "@/components/ui/mobile/MobileActionCard"
import { StatusPill } from "@/components/ui/StatusPill"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import type { AutomationsDashboardData, CostTimelinePoint, RunJournalRow } from "@/lib/automations/automations-data"
import {
  runStatusVariant,
  runStatusLabel,
  workflowSeverity,
  severityStatusVariant,
  severityLabel,
  formatRelativeTime,
  formatCostEstimate,
} from "./automations-status"
import { RunDrillDownDialog } from "./RunDrillDownDialog"
import { AutomationsTabs, type AutomationsTabId } from "./AutomationsTabs"
import { VeilleSimulatorCard } from "./VeilleSimulatorCard"

// Mini-sparkline HTML/Tailwind pur — aucune librairie, aucun SVG (convention
// mobile KREDO : jauges/sparklines en HTML+CSS uniquement).
function CostMiniSparkline({ points }: { points: CostTimelinePoint[] }) {
  const recent = points.slice(-14)
  const max = Math.max(...recent.map((p) => p.costEstimate ?? 0), 0.01)

  if (recent.length === 0) {
    return <p className="text-xs text-muted">Aucune donnée récente.</p>
  }

  return (
    <div className="flex h-16 items-end gap-1">
      {recent.map((point) => {
        const isGap = point.costEstimate === null && point.runs > 0
        const heightPct = point.costEstimate !== null ? Math.max(6, (point.costEstimate / max) * 100) : 0
        return (
          <div key={point.day} className="flex-1" title={`${point.day} — ${point.costEstimate !== null ? formatCostEstimate(point.costEstimate) : "non mesuré"}`}>
            <div
              className={isGap ? "rounded-t-sm bg-muted/40" : "rounded-t-sm bg-[var(--color-dataviz-1)] opacity-80"}
              style={{ height: isGap ? "6%" : `${heightPct}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

export function AutomationsMobileDashboard({ data }: { data: AutomationsDashboardData }) {
  const [activeTab, setActiveTab] = useState<AutomationsTabId>("sante")
  const [selectedRun, setSelectedRun] = useState<RunJournalRow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { costs } = data

  const heroTone = data.kpis.stuckNow > 0 ? "danger" : data.kpis.successRatePct30d !== null && data.kpis.successRatePct30d < 80 ? "warning" : "success"

  return (
    <MobileActionPage
      header={<MobilePageHeader eyebrow="Santé & exécution IA" title="Automatisations" />}
      hero={
        activeTab === "sante" ? (
          <MobileHeroInsight
            title="Taux de succès (30 jours)"
            value={data.kpis.successRatePct30d !== null ? `${data.kpis.successRatePct30d}%` : "—"}
            summary={`${data.kpis.runs30d} exécutions · ${data.kpis.stuckNow} bloquée(s) actuellement`}
            tone={heroTone}
          />
        ) : (
          <MobileHeroInsight
            title="Coût (30 derniers jours)"
            value={formatCostEstimate(costs.kpis.cost30d)}
            summary={
              costs.kpis.cost30dDeltaPct !== null
                ? `${costs.kpis.cost30dDeltaPct > 0 ? "+" : ""}${costs.kpis.cost30dDeltaPct}% vs. 30j précédents`
                : "Historique insuffisant pour un delta"
            }
            tone="brand"
          />
        )
      }
      context={<AutomationsTabs activeTab={activeTab} onChange={setActiveTab} />}
    >
      {activeTab === "sante" ? (
        <>
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-heading">Par workflow</h2>
            {data.workflows.map((workflow) => {
              const severity = workflowSeverity(workflow)
              const stuckTotal = workflow.stuckRunningNow + workflow.stuckQueuedNow
              return (
                <MobileActionCard
                  key={workflow.runType}
                  title={workflow.label}
                  description={
                    stuckTotal > 0
                      ? `${stuckTotal} run(s) bloqué(s) — dernier run ${formatRelativeTime(workflow.lastRunAt)}`
                      : `${workflow.runs30d} runs (30j) — dernier run ${formatRelativeTime(workflow.lastRunAt)}`
                  }
                  status={<StatusPill label={severityLabel(severity)} variant={severityStatusVariant(severity)} />}
                />
              )
            })}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-heading">Dernières exécutions</h2>
            {data.journal.slice(0, 10).map((run) => (
              <MobileActionCard
                key={run.id}
                title={run.runTypeLabel}
                description={run.companyName ?? formatRelativeTime(run.createdAt)}
                status={<StatusPill label={runStatusLabel(run.status)} variant={runStatusVariant(run.status)} />}
                primaryAction={
                  <button
                    type="button"
                    className="text-sm font-medium text-primary"
                    onClick={() => {
                      setSelectedRun(run)
                      setDialogOpen(true)
                    }}
                  >
                    Détail
                  </button>
                }
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <SurfaceCard padding="default">
            <h2 className="mb-3 text-sm font-semibold text-heading">Coût par jour (14 derniers jours)</h2>
            <CostMiniSparkline points={costs.timeline} />
          </SurfaceCard>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-heading">Coût par workflow (30j)</h2>
            {data.workflows
              .filter((w) => !w.hasTokensGap)
              .sort((a, b) => (b.totalCost30d ?? 0) - (a.totalCost30d ?? 0))
              .map((workflow) => (
                <MobileActionCard
                  key={workflow.runType}
                  title={workflow.label}
                  description={`${workflow.runs30d} run(s) — ~${formatCostEstimate(workflow.avgCost30d)}/run`}
                  status={<span className="text-sm font-semibold text-heading">{formatCostEstimate(workflow.totalCost30d)}</span>}
                />
              ))}
          </div>

          <VeilleSimulatorCard baseline={costs.veilleSimulator} />

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-heading">Coût par utilisateur</h2>
            {costs.byOwner.map((owner) => (
              <SurfaceCard key={owner.ownerName} padding="compact">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-body">{owner.ownerName}</p>
                  <p className="text-sm font-semibold text-heading">{formatCostEstimate(owner.costEstimate)}</p>
                </div>
                <p className="text-[11px] text-muted">{owner.runs} run(s)</p>
              </SurfaceCard>
            ))}
          </div>
        </>
      )}

      <RunDrillDownDialog
        run={selectedRun}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onRetried={() => setDialogOpen(false)}
      />
    </MobileActionPage>
  )
}
