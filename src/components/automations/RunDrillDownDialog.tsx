"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import { StatusPill } from "@/components/ui/StatusPill"
import { formatDateTime } from "@/lib/formatters"
import type { RunJournalRow } from "@/lib/automations/automations-data"
import { workflowNomenclatureForRunType } from "@/lib/automations/workflow-labels"
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
      const result = await retryFailedRun(run.id)
      if (result.ok) {
        setRetryFeedback("Relance déclenchée — le nouveau run apparaîtra dans le journal.")
        onRetried?.(result.runId)
      } else {
        setRetryFeedback(result.error)
      }
    })
  }

  const canRetry = run.status === "failed"
  const config = run.config as { n8nExecutionId?: string; n8nWorkflowId?: string } | null
  const n8nExecutionId = config?.n8nExecutionId ?? null
  const n8nWorkflowId = config?.n8nWorkflowId ?? null
  const n8nBaseUrl = process.env.NEXT_PUBLIC_N8N_BASE_URL
  const n8nExecutionUrl =
    n8nBaseUrl && n8nWorkflowId && n8nExecutionId
      ? `${n8nBaseUrl}/workflow/${n8nWorkflowId}/executions/${n8nExecutionId}`
      : null

  const triggeredBy =
    run.triggerSource === "cron"
      ? "Cron automatique"
      : run.ownerEmail ?? run.ownerName ?? "Action utilisateur"

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      closeButtonClassName="hidden"
      title={
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-start justify-between gap-2 w-full">
            <span className="font-bold text-heading text-lg sm:text-xl leading-tight">{run.runTypeLabel}</span>
            <StatusPill
              label={runStatusLabel(run.status)}
              variant={runStatusVariant(run.status)}
              className="rounded-md px-2 py-0.5 text-[11px] shrink-0"
            />
          </div>
          <span className="text-xs font-mono text-muted">{workflowNomenclatureForRunType(run.runType)}</span>
        </div>
      }
      footer={
        <div className="flex w-full items-center gap-2">
          {n8nExecutionUrl ? (
            <a
              href={n8nExecutionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex h-9 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-heading transition-colors hover:bg-surface-hover"
            >
              <Image
                src="/icons_set/logo_n8n.png"
                alt="n8n"
                width={16}
                height={16}
                className="size-4 shrink-0 rounded-sm"
              />
              <span className="flex-1 text-center pr-4">Ouvrir l&apos;exécution</span>
            </a>
          ) : n8nExecutionId ? (
            <div className="flex-1 flex h-9 items-center rounded-md border border-border bg-surface px-3 text-[10px] text-muted">
              <Image
                src="/icons_set/logo_n8n.png"
                alt="n8n"
                width={16}
                height={16}
                className="size-4 shrink-0 opacity-60 mr-2"
              />
              <span className="truncate">Exécution: {n8nExecutionId}</span>
            </div>
          ) : (
             <div className="flex-1" />
          )}
          <Button
            variant="secondary"
            className="flex-1 h-9 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1 mb-4">
        {run.companyName ? (
          <Link href={`/prospection/accounts/${run.companyId}`} className="text-sm font-medium text-primary underline underline-offset-2 truncate">
            {run.companyName}
          </Link>
        ) : null}
        <span className="text-xs text-muted">{formatDateTime(run.createdAt)}</span>
      </div>

      <div className="flex flex-col gap-4 text-sm mt-2">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-muted">Déclenchée par</p>
            <p className="text-body truncate">{triggeredBy}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <p className="text-xs text-muted">Durée</p>
              <p className="text-body">{formatDurationMs(run.durationMs)}</p>
            </div>
          </div>
        </div>

        {run.errorMessage ? (
          <div className="rounded-[var(--radius-medium)] border border-danger/20 bg-danger/[0.04] p-3">
            <p className="text-xs font-medium text-danger">Message d&apos;erreur</p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] text-body">{run.errorMessage}</p>
          </div>
        ) : null}

        {canRetry && (
           <div className="mt-2 flex items-center justify-end">
             <Button
               variant="primary"
               size="sm"
               loading={isRetrying}
               loadingLabel="Relance en cours…"
               onClick={handleRetry}
             >
               Relancer
             </Button>
           </div>
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

