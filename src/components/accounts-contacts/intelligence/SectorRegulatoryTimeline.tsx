"use client"

import { useState } from "react"
import { Badge, type BadgeVariant } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import type { SectorRegulatoryView } from "@/lib/intelligence/client-intelligence-sector"
import { SectionBlock, SectorLevelBadge } from "./intelligence-parts"

type SectorRegulatoryTimelineProps = {
  items: SectorRegulatoryView[]
  macroName?: string | null
}

const URGENCY_LABELS: Record<string, string> = {
  critical: "Critique",
  high: "Forte",
  medium: "Normale",
  low: "Faible",
}

const STATE_LABELS: Record<SectorRegulatoryView["state"], string> = {
  future: "Futur",
  imminent: "Imminent",
  expired: "Expiré",
  undated: "Sans date",
}

function formatDate(value: string | null): string {
  if (!value) return "Date non documentée"
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}

function urgencyVariant(item: SectorRegulatoryView): BadgeVariant {
  if (item.state === "expired") return "neutral"
  if (item.urgency === "critical") return "danger"
  if (item.urgency === "high") return "warning"
  return "brand"
}

function urgencyAccent(item: SectorRegulatoryView): string {
  if (item.state === "expired") return "border-muted/50"
  if (item.urgency === "critical") return "border-danger"
  if (item.urgency === "high") return "border-warning"
  return "border-primary"
}

export function SectorRegulatoryTimeline({ items, macroName }: SectorRegulatoryTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  function toggle(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <SectionBlock title="Calendrier réglementaire" action={<span className="text-[10px] font-semibold text-white/75">{items.length} jalons</span>} className="h-full">
      {items.length > 0 ? (
        <ol className="relative flex flex-col gap-1 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-border">
          {items.map((item) => {
            const expanded = expandedIds.has(item.id)
            return (
              <li key={item.id} className={cn("relative pl-7", item.state === "expired" && "opacity-65")}>
                <span aria-hidden="true" className={cn("absolute left-0 top-5 size-[15px] rounded-full border-[3px] bg-surface", urgencyAccent(item))} />
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-expanded={expanded}
                  className={cn(
                    "min-h-11 w-full border-b border-border px-0 py-3 text-left transition-colors duration-200 motion-reduce:transition-none",
                    "hover:bg-canvas/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  )}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <time dateTime={item.deadlineDate ?? undefined} className="text-[10px] font-black uppercase tracking-wider text-heading">
                      {formatDate(item.deadlineDate)}
                    </time>
                    <Badge variant={urgencyVariant(item)}>{URGENCY_LABELS[item.urgency] ?? item.urgency}</Badge>
                    <Badge variant={item.state === "imminent" ? "brass" : "neutral"}>{STATE_LABELS[item.state]}</Badge>
                    <SectorLevelBadge level={item.resolvedLevel} macroName={macroName} />
                  </span>
                  <span className="mt-1 block text-sm font-bold leading-snug text-heading">{item.title}</span>
                  {item.authority ? <span className="mt-1 block text-[11px] font-medium text-muted">{item.authority}</span> : null}
                </button>

                {expanded ? (
                  <div className="border-b border-border bg-canvas/45 px-3 py-3 text-xs leading-relaxed text-body">
                    {item.description ? <p>{item.description}</p> : <p className="italic text-muted">Description non documentée.</p>}
                    <dl className="mt-3 grid gap-2">
                      {item.kredoPractice ? <div><dt className="font-bold text-heading">Pratique KREDO</dt><dd>{item.kredoPractice}</dd></div> : null}
                      {item.commercialAngle ? <div><dt className="font-bold text-heading">Angle commercial</dt><dd>{item.commercialAngle}</dd></div> : null}
                      <div><dt className="font-bold text-heading">Fenêtre commerciale</dt><dd>{item.isCommercialWindow ? "Oui, qualification explicite KREDO" : "Non"}</dd></div>
                    </dl>
                    {item.sourceUrl ? (
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        Consulter la source
                      </a>
                    ) : item.deadlineDate ? (
                      <p className="mt-3 font-semibold text-muted">Date sans URL source enregistrée — à confirmer.</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-xs italic text-muted">Aucun jalon réglementaire documenté.</p>
      )}
    </SectionBlock>
  )
}
