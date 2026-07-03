"use client"

import { AccountSummaryReportView } from "@/components/reports/AccountSummaryReportView"
import type { AccountSummaryContent } from "@/app/(app)/reports/_data/reports-types"

type ClientSummaryDocumentContentProps = {
  contentJson: unknown
  contentText: string | null
  isMobile?: boolean
  fallbackClassName?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function parseAccountSummaryContent(value: unknown): AccountSummaryContent | null {
  if (!isRecord(value)) return null

  const facts = value.facts
  const narrative = value.narrative
  const sourceRefs = value.sourceRefs
  const qaFlags = value.qaFlags

  if (!isRecord(facts) || !isRecord(narrative)) return null
  if (!Array.isArray(sourceRefs) || !Array.isArray(qaFlags)) return null

  const dataCutoffAt = facts.dataCutoffAt
  const analysis = narrative.analysis
  const nextBestAction = narrative.nextBestAction
  const recommendedApproach = narrative.recommendedApproach

  if (typeof dataCutoffAt !== "string" || !dataCutoffAt.trim()) return null
  if (typeof analysis !== "string" || !analysis.trim()) return null
  if (typeof nextBestAction !== "string" || !nextBestAction.trim()) return null
  if (!isRecord(recommendedApproach) || typeof recommendedApproach.argument !== "string") {
    return null
  }

  return value as AccountSummaryContent
}

export function ClientSummaryDocumentContent({
  contentJson,
  contentText,
  isMobile = false,
  fallbackClassName,
}: ClientSummaryDocumentContentProps) {
  const structuredContent = parseAccountSummaryContent(contentJson)

  if (structuredContent) {
    return <AccountSummaryReportView content={structuredContent} isMobile={isMobile} />
  }

  if (contentText) {
    return (
      <div className={fallbackClassName ?? "rounded-[var(--radius-medium)] border border-border bg-canvas/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body"}>
        {contentText}
      </div>
    )
  }

  return <p className="text-sm text-muted">Aucun contenu texte disponible.</p>
}
