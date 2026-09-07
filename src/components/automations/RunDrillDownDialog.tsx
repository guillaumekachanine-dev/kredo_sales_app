"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { AppDialog } from "@/components/ui/AppDialog"
import { StatusPill } from "@/components/ui/StatusPill"
import { formatDateTime } from "@/lib/formatters"
import type { RunJournalRow } from "@/lib/automations/automations-data"
import { resolveWorkflowResultHref } from "@/lib/automations/resolve-workflow-result-href"
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
  const isActive = run?.status === "queued" || run?.status === "running"
  const [now, setNow] = useState(() => Date.now())

  // Rafraîchir chaque seconde UNIQUEMENT lorsque la modale est ouverte et que le run est actif
  useEffect(() => {
    if (!open || !isActive || !run) return
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [open, isActive, run])

  const displayedDuration = useMemo(() => {
    if (!run) return "—"
    if (isActive) {
      const start = new Date(run.startedAt ?? run.createdAt).getTime()
      const elapsedMs = Math.max(0, now - start)
      return formatDurationMs(elapsedMs)
    }
    return formatDurationMs(run.durationMs)
  }, [run, isActive, now])

  if (!run) return null

  const resultHref = resolveWorkflowResultHref(run)

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
        <div className="flex flex-wrap sm:flex-nowrap w-full items-center gap-2">
          {resultHref ? (
            <Link
              href={resultHref}
              onClick={() => onOpenChange(false)}
              className="flex-1 flex h-8 items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 shadow-2xs"
            >
              <span>Voir le livrable</span>
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          ) : null}
          <Link
            href={`/automations?run=${run.id}`}
            onClick={() => onOpenChange(false)}
            className="flex-1 flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium text-heading transition-colors hover:bg-surface-hover shadow-2xs"
          >
            <svg className="size-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span className="truncate">Automatisations</span>
          </Link>
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
              <p className="text-body font-medium flex items-center gap-1.5">
                {isActive && (
                  <span className="inline-block size-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
                )}
                <span>{displayedDuration}</span>
              </p>
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

