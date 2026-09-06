"use client"

import { useState } from "react"

import type { ClientIntelligenceData } from "@/lib/intelligence/intelligence-data"
import {
  ACCOUNT_WATCH_CADENCE_LABELS,
  ACCOUNT_WATCH_LEVEL_LABELS,
} from "@/lib/intelligence/account-watch-settings"
import { cn } from "@/lib/utils"
import { AccountSignalsCard } from "./AccountKnowledgeBlocks"
import { AccountWatchHeaderActions } from "./AccountWatchHeaderActions"

const WATCH_STATUS_LABELS = {
  queued: "En file d’attente",
  running: "Mise à jour en cours",
  succeeded: "Dernière mise à jour réussie",
  failed: "Dernière mise à jour en échec",
} as const

type Feedback = {
  message: string
  tone: "info" | "success" | "error"
} | null

export function AccountWatchMobileTab({ data }: { data: ClientIntelligenceData }) {
  const [feedback, setFeedback] = useState<Feedback>(null)
  const { accountWatch, company } = data
  const statusLabel = accountWatch.lastStatus
    ? WATCH_STATUS_LABELS[accountWatch.lastStatus]
    : "Aucune mise à jour exécutée"

  return (
    <div className="space-y-4">
      <section className="space-y-4 border-y border-edito-border bg-edito-surface px-4 py-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em]",
                accountWatch.isEnabled ? "text-success" : "text-edito-muted",
              )}
            >
              <span
                className={cn("size-1.5 rounded-full", accountWatch.isEnabled ? "bg-success" : "bg-edito-muted")}
                aria-hidden="true"
              />
              {accountWatch.isEnabled ? "Veille active" : "Veille inactive"}
            </span>
            <span className="text-[10px] font-semibold text-edito-muted">
              {ACCOUNT_WATCH_LEVEL_LABELS[accountWatch.watchLevel]} · {ACCOUNT_WATCH_CADENCE_LABELS[accountWatch.cadence]}
            </span>
          </div>
          <p className="text-xs font-semibold text-edito-heading">{statusLabel}</p>
          {accountWatch.lastError ? (
            <p className="text-[11px] leading-relaxed text-danger">{accountWatch.lastError}</p>
          ) : null}
        </div>

        <AccountWatchHeaderActions
          companyId={company.id}
          companyName={company.name}
          companyLogoPath={company.logoPath}
          companyWebsite={company.website}
          onFeedback={(message, tone) => setFeedback({ message, tone })}
        />

        {feedback ? (
          <p
            role="status"
            className={cn(
              "mt-3 border-t border-edito-border pt-3 text-[11px] font-semibold",
              feedback.tone === "success"
                ? "text-success"
                : feedback.tone === "error"
                  ? "text-danger"
                  : "text-info",
            )}
          >
            {feedback.message}
          </p>
        ) : null}
      </section>

      <div className="px-4">
        <AccountSignalsCard
          signals={data.accountSignals}
          isMobile
          companyId={company.id}
          companyName={company.name}
          lastUpdatedAt={accountWatch.lastRunAt}
        />
      </div>
    </div>
  )
}
