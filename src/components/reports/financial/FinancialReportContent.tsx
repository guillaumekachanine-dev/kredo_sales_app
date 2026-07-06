"use client"

import type { FinancialReportDocumentContent } from "@/app/(app)/reports/_data/reports-types"
import { FinancialReportDesktopContent } from "./FinancialReportDesktopContent"
import { FinancialReportMobileContent } from "./FinancialReportMobileContent"

type FinancialReportContentProps = {
  contentJson: unknown
  contentText: string | null
  isMobile?: boolean
  fallbackClassName?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function parseFinancialReportContent(value: unknown): FinancialReportDocumentContent | null {
  if (!isRecord(value)) return null
  if (value.reportType !== "financial") return null
  if (typeof value.title !== "string" || typeof value.generatedAt !== "string") return null
  if (!isRecord(value.facts)) return null
  return value as FinancialReportDocumentContent
}

export function FinancialReportContent({
  contentJson,
  contentText,
  isMobile = false,
  fallbackClassName,
}: FinancialReportContentProps) {
  const structuredContent = parseFinancialReportContent(contentJson)

  if (structuredContent) {
    if (isMobile) {
      return <FinancialReportMobileContent content={structuredContent} />
    }
    return <FinancialReportDesktopContent content={structuredContent} />
  }

  if (contentText) {
    return (
      <div
        className={
          fallbackClassName ??
          "rounded-[var(--radius-medium)] border border-border bg-canvas/40 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-body"
        }
      >
        {contentText}
      </div>
    )
  }

  return <p className="text-sm text-muted">Aucun contenu disponible.</p>
}
