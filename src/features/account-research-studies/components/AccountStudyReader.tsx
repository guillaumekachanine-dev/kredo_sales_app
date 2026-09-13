"use client"

// ─── Rapport complet : l'étude entière, dans son ordre d'origine ────────────
// Chaque bloc de l'étude, sans exception, dans l'ordre du document — c'est le texte
// intégral extrait du PDF. Le PDF original reste ouvrable, octet pour octet.

import { useState, useTransition } from "react"

import { AppDialog } from "@/components/ui/AppDialog"
import { formatDayMonthYear } from "@/lib/formatting/date-fr"
import { cn } from "@/lib/utils"

import { getStudyOriginalUrlAction } from "../actions/study-actions"
import type { StudyReportView } from "../domain/study-view"
import { DocumentEntry } from "./StudyReportParts"
import { StudyBlockContent } from "./StudyText"

export function AccountStudyReader({
  open,
  onOpenChange,
  view,
  studyId,
  companyName,
  isMobile = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: StudyReportView
  studyId: string
  companyName: string
  isMobile?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const openOriginal = () => {
    setError(null)
    startTransition(async () => {
      const result = await getStudyOriginalUrlAction(studyId)
      if (result.ok) window.open(result.value, "_blank", "noopener,noreferrer")
      else setError(result.error)
    })
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      dataTheme="edito-bright-cockpit"
      title={
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Rapport complet — {companyName}</p>
          <h2 className="mt-0.5 font-heading text-base font-bold text-edito-navy">{view.title}</h2>
          <p className="mt-1 text-[11px] text-edito-muted">
            {view.fileName} · importée le {formatDayMonthYear(view.importedAt)} · {view.orderedBlocks.length} blocs, texte intégral
          </p>
        </div>
      }
      className={cn("bg-edito-surface", isMobile ? "!w-[calc(100vw-1rem)]" : "sm:!max-w-3xl")}
      maxHeightClassName="max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)]"
      bodyClassName="pr-2"
    >
      <article className="mx-auto max-w-2xl space-y-3 pb-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-edito-border pb-3">
          <button
            type="button"
            onClick={openOriginal}
            disabled={pending}
            className={cn(
              "inline-flex items-center rounded border border-edito-navy px-3 text-[11px] font-bold text-edito-navy hover:bg-edito-navy hover:text-edito-surface disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-brass/60",
              isMobile ? "min-h-[44px]" : "min-h-8",
            )}
          >
            {pending
              ? "Ouverture…"
              : view.producer === "chatgpt_work" || view.fileName.toLowerCase().endsWith(".json")
                ? "Ouvrir le JSON original"
                : "Ouvrir le PDF original"}
          </button>
          {error ? <p role="alert" className="text-[11px] font-medium text-danger">{error}</p> : null}
        </div>

        {view.orderedBlocks.map((block) => (
          <StudyBlockContent key={block.id} block={block} isMobile={isMobile} />
        ))}

        {view.bibliography.length > 0 ? (
          <section aria-labelledby="study-reader-sources" className="space-y-3 border-t border-edito-border pt-4">
            <h3 id="study-reader-sources" className="text-xs font-bold uppercase tracking-wider text-edito-heading">
              Documents cités — {view.bibliography.length}
            </h3>
            <ol className="space-y-2.5">
              {view.bibliography.map((document) => (
                <DocumentEntry key={document.id} document={document} isMobile={isMobile} />
              ))}
            </ol>
          </section>
        ) : null}
      </article>
    </AppDialog>
  )
}
