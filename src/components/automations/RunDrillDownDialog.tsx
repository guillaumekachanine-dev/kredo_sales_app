"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import { formatDateTime } from "@/lib/formatters"
import type { RunJournalRow } from "@/lib/automations/automations-data"
import {
  runStatusVariant,
  runStatusLabel,
  formatDurationMs,
  formatCostEstimate,
} from "./automations-status"
import { retryFailedRun } from "./retry-run"

export interface RunDrillDownDialogProps {
  run: RunJournalRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetried?: (newRunId: string) => void
}

export function RunDrillDownDialog({ run, open, onOpenChange, onRetried }: RunDrillDownDialogProps) {
  const [isRetrying, startRetryTransition] = useTransition()
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null)

  if (!run) return null

  function handleRetry() {
    if (!run) return
    setRetryFeedback(null)
    startRetryTransition(async () => {
      const result = await retryFailedRun(run)
      if (result.ok) {
        setRetryFeedback("Relance déclenchée — le nouveau run apparaîtra dans le journal.")
        onRetried?.(result.runId)
      } else {
        setRetryFeedback(result.error)
      }
    })
  }

  const canRetry = run.status === "failed"
  const n8nExecutionId = (run.config as { n8nExecutionId?: string } | null)?.n8nExecutionId ?? null

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span>{run.runTypeLabel}</span>
          <StatusPill label={runStatusLabel(run.status)} variant={runStatusVariant(run.status)} />
        </div>
      }
      description={formatDateTime(run.createdAt)}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canRetry ? (
            <Button
              variant="primary"
              size="sm"
              loading={isRetrying}
              loadingLabel="Relance en cours…"
              onClick={handleRetry}
            >
              Relancer
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted">Déclenché par</p>
            <p className="text-body">{run.triggerSource === "cron" ? "Cron automatique" : "Action utilisateur"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Propriétaire</p>
            <p className="text-body">{run.ownerName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Durée</p>
            <p className="text-body">{formatDurationMs(run.durationMs)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Coût estimé</p>
            <p className="text-body">
              {run.hasTokensGap
                ? "Non mesuré (callback incomplet)"
                : run.hasPricingGap
                  ? "Non mesuré (modèle non tarifé)"
                  : formatCostEstimate(run.costEstimate)}
            </p>
          </div>
        </div>

        {run.companyName ? (
          <div>
            <p className="text-xs text-muted">Compte concerné</p>
            <Link href={`/prospection/accounts/${run.companyId}`} className="text-primary underline underline-offset-2">
              {run.companyName}
            </Link>
          </div>
        ) : null}

        {run.errorMessage ? (
          <div className="rounded-[var(--radius-medium)] border border-danger/20 bg-danger/[0.04] p-3">
            <p className="text-xs font-medium text-danger">Message d&apos;erreur</p>
            <p className="mt-1 whitespace-pre-wrap text-body">{run.errorMessage}</p>
          </div>
        ) : null}

        {n8nExecutionId ? (
          <p className="text-xs text-muted">Exécution n8n : {n8nExecutionId}</p>
        ) : (
          <p className="text-xs text-muted">
            Identifiant d&apos;exécution n8n non disponible pour ce run — lien direct impossible.
          </p>
        )}

        {retryFeedback ? (
          <p className={retryFeedback.startsWith("Relance déclenchée") ? "text-sm text-success" : "text-sm text-danger"}>
            {retryFeedback}
          </p>
        ) : null}
      </div>
    </AppDialog>
  )
}
