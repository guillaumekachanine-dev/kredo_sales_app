"use client"

import Link from "next/link"
import Image from "next/image"
import { AppDialog } from "@/components/ui/AppDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import { formatDateTime } from "@/lib/formatters"
import type { RunJournalRow } from "@/lib/automations/automations-data"
import {
  runStatusVariant,
  runStatusLabel,
  formatDurationMs,
  formatCostEstimate,
} from "./automations-status"

export interface RunDrillDownDialogProps {
  run: RunJournalRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetried?: (newRunId: string) => void
}

export function RunDrillDownDialog({ run, open, onOpenChange }: RunDrillDownDialogProps) {
  if (!run) return null

  const config = run.config as { n8nExecutionId?: string; n8nWorkflowId?: string } | null
  const n8nExecutionId = config?.n8nExecutionId ?? null
  const n8nWorkflowId = config?.n8nWorkflowId ?? null
  const n8nBaseUrl = process.env.NEXT_PUBLIC_N8N_BASE_URL
  const n8nExecutionUrl =
    n8nBaseUrl && n8nWorkflowId && n8nExecutionId
      ? `${n8nBaseUrl}/workflow/${n8nWorkflowId}/executions/${n8nExecutionId}`
      : null

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className="flex flex-col gap-1 w-full text-left">
          <span className="font-bold text-heading text-lg sm:text-xl leading-tight">
            {run.runTypeLabel}
          </span>
          <span className="text-xs font-mono text-muted">
            {run.runType}
          </span>
          <div className="pt-0.5">
            <StatusPill
              label={runStatusLabel(run.status)}
              variant={runStatusVariant(run.status)}
              className="rounded-md px-2 py-0.5 text-[11px] w-fit"
            />
          </div>
        </div>
      }
      footer={
        <div className="flex w-full items-center gap-2">
          {n8nExecutionUrl ? (
            <a
              href={n8nExecutionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-heading transition-colors hover:bg-surface-hover shadow-2xs"
            >
              <Image
                src="/icons_set/logo_n8n.png"
                alt="n8n"
                width={14}
                height={14}
                className="size-3.5 shrink-0 rounded-sm"
              />
              <span className="truncate">Ouvrir l&apos;exécution</span>
            </a>
          ) : n8nExecutionId ? (
            <div className="flex-1 flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-[10px] text-muted shadow-2xs">
              <Image
                src="/icons_set/logo_n8n.png"
                alt="n8n"
                width={14}
                height={14}
                className="size-3.5 shrink-0 opacity-60"
              />
              <span className="truncate">Exécution: {n8nExecutionId}</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-heading transition-colors hover:bg-surface-hover shadow-2xs cursor-pointer"
          >
            Fermer
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-1 mb-3">
        {run.companyName ? (
          <Link href={`/prospection/accounts/${run.companyId}`} className="text-sm font-medium text-primary underline underline-offset-2 truncate">
            {run.companyName}
          </Link>
        ) : null}
        <span className="text-xs text-muted">{formatDateTime(run.createdAt)}</span>
      </div>

      <div className="flex flex-col gap-3 text-sm">
        {/* Coût estimé et durée (uniquement si ce n'est pas un échec) */}
        {run.status !== "failed" && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-xs text-muted">Coût estimé</p>
              <p className="text-body font-medium">
                {run.hasTokensGap
                  ? "Non mesuré (callback incomplet)"
                  : run.hasPricingGap
                    ? "Non mesuré (modèle non tarifé)"
                    : formatCostEstimate(run.costEstimate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Durée</p>
              <p className="text-body font-medium">{formatDurationMs(run.durationMs)}</p>
            </div>
          </div>
        )}

        {/* Message d'erreur si échec */}
        {run.errorMessage ? (
          <div className="rounded-[var(--radius-medium)] border border-danger/20 bg-danger/[0.04] p-3">
            <p className="text-xs font-medium text-danger">Message d&apos;erreur</p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] text-body">{run.errorMessage}</p>
          </div>
        ) : null}
      </div>
    </AppDialog>
  )
}

