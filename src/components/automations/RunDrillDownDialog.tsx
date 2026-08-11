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
      title={
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-heading text-sm sm:text-base">{run.runTypeLabel}</span>
            <StatusPill
              label={runStatusLabel(run.status)}
              variant={runStatusVariant(run.status)}
              className="rounded-md px-2 py-0.5 text-[11px]"
            />
          </div>
          <span className="text-xs font-mono text-muted">{workflowNomenclatureForRunType(run.runType)}</span>
        </div>
      }
      description={formatDateTime(run.createdAt)}
      footer={
        canRetry ? (
          <div className="flex items-center justify-end">
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
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted">Déclenchée par</p>
            <p className="text-body truncate">{triggeredBy}</p>
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
          <div>
            <p className="text-xs text-muted">Compte concerné</p>
            {run.companyName ? (
              <Link href={`/prospection/accounts/${run.companyId}`} className="text-primary underline underline-offset-2 truncate block">
                {run.companyName}
              </Link>
            ) : (
              <p className="text-body">—</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted">Durée</p>
            <p className="text-body">{formatDurationMs(run.durationMs)}</p>
          </div>
        </div>

        {run.errorMessage ? (
          <div className="rounded-[var(--radius-medium)] border border-danger/20 bg-danger/[0.04] p-3">
            <p className="text-xs font-medium text-danger">Message d&apos;erreur</p>
            <p className="mt-1 whitespace-pre-wrap text-body">{run.errorMessage}</p>
          </div>
        ) : null}

        {n8nExecutionUrl ? (
          <a
            href={n8nExecutionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-primary underline underline-offset-2 hover:text-primary-deep"
          >
            <Image
              src="/icons_set/logo_n8n.png"
              alt="n8n"
              width={16}
              height={16}
              className="size-4 shrink-0 rounded-sm"
            />
            <span>Ouvrir l&apos;exécution dans n8n ↗</span>
          </a>
        ) : n8nExecutionId ? (
          <div className="inline-flex items-center gap-2 text-xs text-muted">
            <Image
              src="/icons_set/logo_n8n.png"
              alt="n8n"
              width={16}
              height={16}
              className="size-4 shrink-0 opacity-60"
            />
            <span>Exécution n8n : {n8nExecutionId}</span>
          </div>
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

