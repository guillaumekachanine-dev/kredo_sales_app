"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { AppDialog } from "@/components/ui/AppDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import { formatDateTime } from "@/lib/formatters"
import type { RunJournalRow } from "@/lib/automations/automations-data"
import { fetchFilteredRunJournal } from "@/lib/automations/run-journal-actions"
import { workflowLabelForRunType, workflowNomenclatureForRunType } from "@/lib/automations/workflow-labels"
import {
  formatCostEstimate,
  formatDurationMs,
  runStatusLabel,
  runStatusVariant,
} from "./automations-status"
import { RunDrillDownDialog } from "./RunDrillDownDialog"
import { cn } from "@/lib/utils"

export type WorkflowExecutionsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string | null
  workflowLabel?: string | null
  periodLabel?: string
  dateRange: { from: string; to: string }
  initialRuns?: RunJournalRow[]
}

export function WorkflowExecutionsModal({
  open,
  onOpenChange,
  workflowId,
  workflowLabel,
  periodLabel = "Période active",
  dateRange,
  initialRuns,
}: WorkflowExecutionsModalProps) {
  const [filterMode, setFilterMode] = useState<"all" | "failed">("all")
  const [runs, setRuns] = useState<RunJournalRow[]>(() => {
    if (initialRuns && initialRuns.length > 0 && workflowId) {
      return initialRuns.filter(
        (r) =>
          r.runType === workflowId ||
          (workflowId === "veille-hebdomadaire-kredo" && (r.runType === "global-watch" || r.runType === "global_watch")) ||
          (workflowId === "account_watch_refresh" && r.runType === "intel-033-account-watch-refresh")
      )
    }
    return []
  })
  const [isLoading, startLoading] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<RunJournalRow | null>(null)

  const resolvedLabel = workflowLabel || (workflowId ? workflowLabelForRunType(workflowId) : "")
  const resolvedNomenclature = workflowId ? workflowNomenclatureForRunType(workflowId) : ""

  // Charger les exécutions complètes du workflow sur la plage de date à l'ouverture
  useEffect(() => {
    if (!open || !workflowId) return

    let active = true
    startLoading(async () => {
      try {
        const result = await fetchFilteredRunJournal({
          from: dateRange.from,
          to: dateRange.to,
          workflow: workflowId,
          status: "all",
          limit: 200,
        })

        if (!active) return
        if (result.ok) {
          setRuns(result.rows)
          setErrorMessage(null)
        } else {
          setErrorMessage(result.error)
        }
      } catch (err) {
        if (!active) return
        setErrorMessage(err instanceof Error ? err.message : "Erreur de chargement des exécutions")
      }
    })

    return () => {
      active = false
    }
  }, [open, workflowId, dateRange.from, dateRange.to])

  const failedCount = useMemo(() => runs.filter((r) => r.status === "failed").length, [runs])
  const succeededCount = useMemo(() => runs.filter((r) => r.status === "succeeded").length, [runs])

  const displayedRuns = useMemo(() => {
    if (filterMode === "failed") {
      return runs.filter((r) => r.status === "failed")
    }
    return runs
  }, [runs, filterMode])

  if (!workflowId) return null

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        className="w-[min(calc(100vw-1.5rem),44rem)] sm:max-w-2xl"
        maxHeightClassName="max-h-[min(calc(100dvh-2rem),46rem)]"
        title={
          <div className="flex flex-col gap-1 w-full text-left">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-2 bg-brand-brass rounded-full" />
              <span className="font-bold text-heading text-base sm:text-lg leading-tight truncate">
                {resolvedLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="font-mono text-[10px] text-muted bg-white/[0.04] px-1.5 py-0.5 rounded border border-border/40">
                {workflowId}
              </span>
              <span className="text-[10px] text-muted font-medium">
                {resolvedNomenclature}
              </span>
              <span className="text-[10px] text-muted/60">·</span>
              <span className="text-[10px] text-muted font-medium bg-canvas px-2 py-0.5 rounded-full border border-border/40">
                {periodLabel}
              </span>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Barre de contrôle : Sélecteur Toggle Tout / Échecs & Statistiques */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div
              className="inline-flex items-center rounded-lg border border-border/60 bg-canvas/90 p-1 shadow-2xs"
              role="group"
              aria-label="Filtrer les exécutions affichées"
            >
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                aria-pressed={filterMode === "all"}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5",
                  filterMode === "all"
                    ? "bg-surface text-heading shadow-xs border border-border/50"
                    : "text-muted hover:text-heading"
                )}
              >
                <span>Tout</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  filterMode === "all" ? "bg-primary/10 text-primary font-bold" : "bg-muted/15 text-muted"
                )}>
                  {runs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode("failed")}
                aria-pressed={filterMode === "failed"}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5",
                  filterMode === "failed"
                    ? "bg-danger/10 text-danger shadow-xs border border-danger/30 font-bold"
                    : "text-muted hover:text-danger"
                )}
              >
                <span>Échecs</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  failedCount > 0
                    ? "bg-danger text-white font-bold animate-pulse"
                    : "bg-muted/15 text-muted"
                )}>
                  {failedCount}
                </span>
              </button>
            </div>

            {/* Indicateur de santé rapide */}
            <div className="flex items-center gap-2 text-xs text-muted">
              {isLoading ? (
                <span className="text-[11px] text-brand-brass animate-pulse">Chargement…</span>
              ) : (
                <>
                  <span className="text-success font-medium">{succeededCount} succès</span>
                  <span>·</span>
                  <span className={failedCount > 0 ? "text-danger font-medium" : "text-muted"}>
                    {failedCount} échec{failedCount > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Message d'erreur de chargement */}
          {errorMessage && (
            <div className="rounded-lg border border-danger/20 bg-danger/[0.04] p-3 text-xs text-danger">
              <p className="font-semibold">Erreur lors de la récupération des exécutions</p>
              <p className="text-[11px] mt-0.5 opacity-90">{errorMessage}</p>
            </div>
          )}

          {/* Liste des exécutions */}
          <div className="flex flex-col gap-2 min-h-40 max-h-[26rem] overflow-y-auto overscroll-contain pr-1">
            {isLoading && runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
                <span className="size-5 border-2 border-brand-brass border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Chargement des exécutions…</span>
              </div>
            ) : displayedRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-border/30 bg-surface/50">
                {filterMode === "failed" ? (
                  <>
                    <div className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success mb-2">
                      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-heading">Aucun échec sur cette période</p>
                    <p className="text-[11px] text-muted mt-1 max-w-sm">
                      Toutes les exécutions de ce workflow ont abouti avec succès sur la période sélectionnée.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-heading">Aucune exécution trouvée</p>
                    <p className="text-[11px] text-muted mt-1 max-w-sm">
                      Aucune exécution enregistrée pour ce workflow sur la période &laquo; {periodLabel} &raquo;.
                    </p>
                  </>
                )}
              </div>
            ) : (
              displayedRuns.map((run) => {
                const isFailed = run.status === "failed"
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRun(run)}
                    className={cn(
                      "group flex flex-col gap-2 p-3 rounded-lg border text-left transition-all cursor-pointer",
                      isFailed
                        ? "border-danger/30 bg-danger/[0.02] hover:bg-danger/[0.05] hover:border-danger/50"
                        : "border-border/60 bg-surface hover:bg-surface-hover/80 hover:border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <StatusPill
                          label={runStatusLabel(run.status)}
                          variant={runStatusVariant(run.status)}
                          className="rounded-md px-1.5 py-0.2 text-[10px] shrink-0 font-medium"
                        />
                        <span className="text-xs font-bold text-heading truncate">
                          {run.companyName || run.runTypeLabel}
                        </span>
                        {run.triggerSource === "cron" && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-white/[0.04] text-muted border border-border/40 shrink-0">
                            Cron
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-muted tabular-nums">
                          {formatDateTime(run.createdAt)}
                        </span>
                        <svg
                          className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted border-t border-border/30 pt-2">
                      <div className="flex items-center gap-3">
                        <span>
                          Durée :{" "}
                          <strong className="font-mono text-heading font-medium">
                            {formatDurationMs(run.durationMs)}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Coût :{" "}
                          <strong className="font-mono text-heading font-medium">
                            {formatCostEstimate(run.costEstimate)}
                          </strong>
                        </span>
                      </div>
                      {run.ownerName && (
                        <span className="truncate max-w-[14rem]">
                          Par : {run.ownerName}
                        </span>
                      )}
                    </div>

                    {isFailed && run.errorMessage && (
                      <div className="mt-1 rounded border border-danger/20 bg-danger/[0.05] p-2 text-[11px] text-danger font-mono leading-tight break-words">
                        <span className="font-bold">Erreur : </span>
                        {run.errorMessage}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      </AppDialog>

      {/* Drill down modal quand on clique sur une exécution de la liste */}
      <RunDrillDownDialog
        run={selectedRun}
        open={selectedRun !== null}
        onOpenChange={(openState) => {
          if (!openState) setSelectedRun(null)
        }}
        onRetried={() => setSelectedRun(null)}
      />
    </>
  )
}
