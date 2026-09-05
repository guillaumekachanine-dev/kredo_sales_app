import { useMemo } from "react"
import type { SectorKnowledgeRegulatoryItem } from "@/features/master-study/data/get-sector-knowledge-read-model"
import { provenanceLabel } from "../home/home-model"

type RegulatoryCalendarMobileProps = {
  regulatory: SectorKnowledgeRegulatoryItem[]
  segmentName: string
}

function formatRegulatoryDate(value: string | null): string {
  if (!value) return "Cadre permanent"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Cadre permanent"
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

function getSortableTime(item: SectorKnowledgeRegulatoryItem): number {
  if (!item.deadlineDate) return Number.POSITIVE_INFINITY
  const time = new Date(item.deadlineDate).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const norm = urgency.toLowerCase()
  if (norm === "haute" || norm === "urgent" || norm === "high" || norm === "critique") {
    return (
      <span className="inline-flex items-center rounded border border-danger/40 bg-danger/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-danger">
        Urgent
      </span>
    )
  }
  if (norm === "moyenne" || norm === "medium") {
    return (
      <span className="inline-flex items-center rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-status-warning-ink">
        Moyen
      </span>
    )
  }
  return null
}

export function RegulatoryCalendarChapterMobile({ regulatory, segmentName }: RegulatoryCalendarMobileProps) {
  const sortedItems = useMemo(() => {
    return [...regulatory].sort((a, b) => {
      const timeA = getSortableTime(a)
      const timeB = getSortableTime(b)
      if (timeA === timeB) return a.name.localeCompare(b.name, "fr")
      return timeA - timeB
    })
  }, [regulatory])

  if (regulatory.length === 0) {
    return (
      <section className="px-4 py-8 text-center">
        <h2 className="font-heading text-base font-bold text-heading">Aucun texte réglementaire</h2>
        <p className="mt-2 text-xs text-muted">
          Le segment {segmentName} ne dispose pas encore de jalons réglementaires documentés.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-4 px-4 py-4" data-chapter="regulatory-calendar-mobile">
      <div className="space-y-3">
        {sortedItems.map((item) => (
          <details key={item.id} className="group rounded-xl border border-border bg-surface overflow-hidden">
            <summary className="flex min-h-14 cursor-pointer list-none flex-col justify-center px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <time className="font-mono text-xs font-bold text-primary">
                    {formatRegulatoryDate(item.deadlineDate)}
                  </time>
                  <UrgencyBadge urgency={item.urgency} />
                </div>
                <span className="text-muted transition-transform group-open:rotate-180 text-xs" aria-hidden="true">⌄</span>
              </div>
              <h2 className="mt-1 font-heading text-xs font-bold text-heading line-clamp-1">{item.name}</h2>
              {item.authority ? (
                <p className="text-[10px] text-muted">{item.authority}</p>
              ) : null}
            </summary>

            <div className="border-t border-border px-4 py-3 space-y-2.5 text-xs text-body">
              {item.description ? (
                <p className="leading-relaxed">{item.description}</p>
              ) : null}

              {item.commercialAngle ? (
                <div className="rounded border border-brand-brass/40 bg-brand-brass/5 p-2.5">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-brand-brass">Angle commercial</span>
                  <p className="mt-0.5 text-xs text-heading">{item.commercialAngle}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-[10px] text-muted">
                <span>Practice : <strong className="text-heading">{item.kredoPractice ?? "Transverse"}</strong></span>
                <span>Source : {provenanceLabel(item.resolvedLevel)}</span>
              </div>

              {item.sourceUrl ? (
                <div className="pt-1">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center text-xs font-semibold text-primary"
                  >
                    Voir la source officielle ↗
                  </a>
                </div>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
