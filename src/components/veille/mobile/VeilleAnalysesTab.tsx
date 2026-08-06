"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { StrategicWatchAnalysis } from "../veille-desktop-contracts"
import {
  IconBulb,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconTarget,
  IconWarningTriangle,
} from "./icons"
import { buildAnalysisIndex, type AnalysisSectionKey } from "./veille-mobile-view-models"

type VeilleAnalysesTabProps = {
  analyses: StrategicWatchAnalysis[]
  selectedAnalysisId: string | null
  onSelectAnalysis: (analysisId: string | null) => void
}

const SECTION_ICONS: Record<AnalysisSectionKey, React.ComponentType<{ className?: string }>> = {
  trends: IconTarget,
  opportunities: IconBulb,
  risks: IconWarningTriangle,
}

export function VeilleAnalysesTab({
  analyses,
  selectedAnalysisId,
  onSelectAnalysis,
}: VeilleAnalysesTabProps) {
  const activeAnalysis = useMemo(() => {
    if (analyses.length === 0) return null
    return analyses.find((analysis) => analysis.id === selectedAnalysisId) ?? analyses[0]
  }, [analyses, selectedAnalysisId])

  const index = useMemo(() => (activeAnalysis ? buildAnalysisIndex(activeAnalysis) : null), [activeAnalysis])

  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [openSections, setOpenSections] = useState<Record<AnalysisSectionKey, boolean>>({
    trends: false,
    opportunities: false,
    risks: false,
  })
  // La sélection porte l'identifiant de l'analyse dont elle provient : changer
  // de période referme donc le détail par simple dérivation, sans effet qui
  // repousserait du state (cascading render).
  const [detailSelection, setDetailSelection] = useState<{
    analysisId: string
    sectionKey: AnalysisSectionKey
    itemIndex: number
  } | null>(null)

  const detailItem = useMemo(() => {
    if (!index || !detailSelection || detailSelection.analysisId !== index.id) return null
    const section = index.sections.find((candidate) => candidate.key === detailSelection.sectionKey)
    const item = section?.items[detailSelection.itemIndex]
    if (!section || !item) return null
    return { section, item }
  }, [index, detailSelection])

  if (!index) {
    return (
      <div className="veille-scrollbar h-full overflow-y-auto bg-surface px-6 py-16">
        <p className="text-center text-sm leading-6 text-muted">
          Aucune analyse stratégique disponible. Elle est produite à partir des briefings du mois écoulé.
        </p>
      </div>
    )
  }

  if (detailItem) {
    const { section, item } = detailItem
    const SectionIcon = SECTION_ICONS[section.key]
    return (
      <div className="veille-scrollbar h-full overflow-y-auto overscroll-contain bg-surface">
        <div className="border-b border-border px-4 py-2">
          <button
            type="button"
            onClick={() => setDetailSelection(null)}
            className="-ml-1 inline-flex min-h-9 items-center gap-1 pr-2 text-xs font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-heading"
          >
            <IconChevronLeft className="size-4" />
            Retour à l&apos;index
          </button>
        </div>

        <article className="px-4 pb-8 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
            {section.label}
          </p>

          <div className="mt-4 flex items-start gap-3">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-heading text-surface">
              <SectionIcon className="size-6" />
            </span>
            <h2 className="min-w-0 flex-1 font-heading text-[22px] font-bold leading-7 tracking-tight text-heading">
              {item.title}
            </h2>
          </div>

          <p className="mt-4 text-[15px] leading-[1.6] text-body">{item.body}</p>

          <p className="mt-8 border-t border-border pt-4 text-xs text-muted">
            {index.periodLabel}
            {index.coverageLabel ? ` · ${index.coverageLabel}` : ""}
          </p>
        </article>
      </div>
    )
  }

  return (
    <div className="veille-scrollbar h-full overflow-y-auto overscroll-contain bg-surface">
      <header className="border-b border-border px-4 py-4">
        <h1 className="text-[17px] font-bold leading-6 text-heading">
          {index.analysisTitle}
        </h1>
        {index.metaSubtitle ? (
          <p className="mt-1 text-xs text-muted">{index.metaSubtitle}</p>
        ) : index.producedAtLabel ? (
          <p className="mt-1 text-xs text-muted">{index.producedAtLabel}</p>
        ) : null}
      </header>

      {analyses.length > 1 ? (
        <div className="border-b border-border px-4 py-3">
          <label
            htmlFor="veille-analysis-period"
            className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
          >
            Période analysée
          </label>
          <select
            id="veille-analysis-period"
            value={index.id}
            onChange={(event) => onSelectAnalysis(event.target.value)}
            className="mt-1.5 h-12 w-full rounded-[var(--radius-small)] border border-border bg-surface px-3 text-[15px] text-heading outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {analyses.map((analysis) => (
              <option key={analysis.id} value={analysis.id}>
                {analysis.content?.period?.label ?? analysis.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {index.executiveSummary ? (
        <div className="border-b border-border px-4 py-5">
          <h2 className="mb-2.5 text-[18px] font-bold text-heading">Synthèse</h2>
          <p
            className={cn(
              "border-l-[3px] border-brand-brass pl-4 text-[16px] leading-[1.5] text-heading",
              summaryExpanded ? undefined : "line-clamp-4",
            )}
          >
            {index.executiveSummary}
          </p>
          <button
            type="button"
            onClick={() => setSummaryExpanded((previous) => !previous)}
            aria-expanded={summaryExpanded}
            className="mt-2 min-h-11 pl-4 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-heading"
          >
            {summaryExpanded ? "Réduire la synthèse" : "Lire la synthèse complète"}
          </button>
        </div>
      ) : null}

      {index.sections.map((section) => {
        const SectionIcon = SECTION_ICONS[section.key]
        const isOpen = openSections[section.key]
        return (
          <section key={section.key} className="border-b border-border">
            <h3>
              <button
                type="button"
                onClick={() =>
                  setOpenSections((previous) => ({ ...previous, [section.key]: !previous[section.key] }))
                }
                aria-expanded={isOpen}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 px-4 py-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset",
                  isOpen ? "bg-surface-hover/50" : "hover:bg-surface-hover/60",
                )}
              >
                <span className="shrink-0 text-primary">
                  <SectionIcon className="size-6" />
                </span>
                <span className="flex-1 text-[18px] font-bold text-heading">{section.label}</span>
                <span className="inline-flex min-w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover px-2 py-0.5 text-xs font-bold text-body">
                  {section.count}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-heading transition-transform",
                    isOpen ? "rotate-0" : "-rotate-90",
                  )}
                >
                  <IconChevronDown className="size-5" />
                </span>
              </button>
            </h3>

            {isOpen ? (
              section.items.length === 0 ? (
                <p className="bg-canvas/50 px-4 py-4 text-sm text-muted">Aucun élément pour cette période.</p>
              ) : (
                <ul className="divide-y divide-border/60 border-t border-border bg-canvas/40">
                  {section.items.map((item, itemIndex) => (
                    <li key={`${section.key}-${itemIndex}`}>
                      <button
                        type="button"
                        onClick={() =>
                          setDetailSelection({
                            analysisId: index.id,
                            sectionKey: section.key,
                            itemIndex,
                          })
                        }
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left outline-none transition-colors hover:bg-surface-hover/80 focus-visible:ring-2 focus-visible:ring-heading focus-visible:ring-inset"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                          <span
                            className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/70"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 text-[15px] font-medium leading-6 text-heading">
                            {item.title}
                          </span>
                        </div>
                        <span className="shrink-0 text-muted">
                          <IconChevronRight className="size-5" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
