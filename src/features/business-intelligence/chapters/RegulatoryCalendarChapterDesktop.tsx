import { useMemo, useState } from "react"
import type { SectorKnowledgeRegulatoryItem } from "@/features/master-study/data/get-sector-knowledge-read-model"
import { provenanceLabel } from "../home/home-model"

type RegulatoryCalendarDesktopProps = {
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
      <span className="inline-flex items-center rounded border border-danger/40 bg-danger/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-danger">
        Urgence haute
      </span>
    )
  }
  if (norm === "moyenne" || norm === "medium") {
    return (
      <span className="inline-flex items-center rounded border border-warning/40 bg-warning/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-status-warning-ink">
        Urgence moyenne
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded border border-edito-border bg-edito-chip px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-edito-muted">
      Normal
    </span>
  )
}

export function RegulatoryCalendarChapterDesktop({ regulatory, segmentName }: RegulatoryCalendarDesktopProps) {
  const [selectedId, setSelectedId] = useState<string | null>(regulatory[0]?.id ?? null)

  const sortedItems = useMemo(() => {
    return [...regulatory].sort((a, b) => {
      const timeA = getSortableTime(a)
      const timeB = getSortableTime(b)
      if (timeA === timeB) return a.name.localeCompare(b.name, "fr")
      return timeA - timeB
    })
  }, [regulatory])

  const selectedItem = useMemo(
    () => sortedItems.find((item) => item.id === selectedId) ?? sortedItems[0] ?? null,
    [sortedItems, selectedId],
  )

  const datedItems = useMemo(() => sortedItems.filter((i) => i.deadlineDate !== null), [sortedItems])
  const undatedItems = useMemo(() => sortedItems.filter((i) => i.deadlineDate === null), [sortedItems])

  if (regulatory.length === 0) {
    return (
      <div className="rounded-xl border border-edito-border bg-edito-surface p-10 text-center">
        <h2 className="font-heading text-lg font-bold text-edito-navy">Aucun texte réglementaire documenté</h2>
        <p className="mt-2 text-sm text-edito-muted">
          Le segment {segmentName} ne dispose pas encore de jalons réglementaires enregistrés.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-chapter="regulatory-calendar">
      {/* En-tête du chapitre */}
      <section className="rounded-xl border border-edito-border bg-edito-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Gouvernance & Conformité</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-edito-navy">Calendrier réglementaire</h1>
            <p className="mt-1 text-xs text-edito-body">
              {regulatory.length} disposition{regulatory.length > 1 ? "s" : ""} réglementaire{regulatory.length > 1 ? "s" : ""} applicable{regulatory.length > 1 ? "s" : ""} au segment {segmentName}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center rounded-md border border-edito-border bg-edito-canvas px-3 py-1.5 text-xs font-semibold text-edito-navy">
              {datedItems.length} jalon{datedItems.length > 1 ? "s" : ""} à échéance · {undatedItems.length} en vigueur
            </span>
          </div>
        </div>
      </section>

      {/* Timeline chronologique supérieure (si des items datés existent) */}
      {datedItems.length > 0 ? (
        <section className="rounded-xl border border-edito-border bg-edito-surface p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
            Chronologie des échéances
          </h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {datedItems.map((item) => {
              const isSelected = selectedItem?.id === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={isSelected}
                  className={`group relative flex w-64 shrink-0 flex-col justify-between rounded-lg border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edito-navy/30 ${
                    isSelected
                      ? "border-edito-navy bg-edito-canvas ring-1 ring-edito-navy"
                      : "border-edito-border bg-edito-surface hover:border-edito-navy/50 hover:bg-edito-canvas/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <time className="text-[10px] font-mono font-bold text-edito-petrol">
                        {formatRegulatoryDate(item.deadlineDate)}
                      </time>
                      <UrgencyBadge urgency={item.urgency} />
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-xs font-bold text-edito-navy">{item.name}</h3>
                    {item.authority ? (
                      <p className="mt-1 text-[10px] text-edito-muted">Autorité : {item.authority}</p>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-edito-border/60 pt-2 text-[9px] text-edito-muted">
                    <span>{item.kredoPractice ?? "Transverse"}</span>
                    <span>{provenanceLabel(item.resolvedLevel)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Grille principale : Tableau des textes (gauche) + Fiche détaillée (droite) */}
      <section className="grid grid-cols-[minmax(0,1.8fr)_minmax(20rem,1.2fr)] gap-5 items-start">
        {/* Liste / Tableau */}
        <div className="rounded-xl border border-edito-border bg-edito-surface overflow-hidden">
          <div className="border-b border-edito-border px-5 py-3.5 bg-edito-canvas/30">
            <h2 className="text-xs font-bold uppercase tracking-wider text-edito-navy">
              Inventaire exhaustif des dispositions
            </h2>
          </div>
          <div className="divide-y divide-edito-border">
            {sortedItems.map((item) => {
              const isSelected = selectedItem?.id === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`flex w-full items-start justify-between gap-4 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-edito-navy/30 ${
                    isSelected ? "bg-edito-canvas border-l-4 border-l-edito-navy" : "hover:bg-edito-canvas/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <time className="text-[11px] font-mono font-bold text-edito-petrol">
                        {formatRegulatoryDate(item.deadlineDate)}
                      </time>
                      <UrgencyBadge urgency={item.urgency} />
                      <span className="text-[10px] text-edito-muted">· {provenanceLabel(item.resolvedLevel)}</span>
                    </div>
                    <h3 className="mt-1 text-xs font-bold text-edito-navy">{item.name}</h3>
                    {item.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-edito-body leading-relaxed">{item.description}</p>
                    ) : null}
                  </div>
                  {item.kredoPractice ? (
                    <span className="shrink-0 rounded bg-edito-chip px-2 py-1 text-[10px] font-semibold text-edito-petrol">
                      {item.kredoPractice}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        {/* Fiche de détail de l'item sélectionné */}
        {selectedItem ? (
          <div className="sticky top-4 rounded-xl border border-edito-border bg-edito-surface p-5 space-y-4">
            <div className="border-b border-edito-border pb-3">
              <div className="flex items-center justify-between gap-2">
                <UrgencyBadge urgency={selectedItem.urgency} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-edito-muted">
                  Source : {provenanceLabel(selectedItem.resolvedLevel)}
                </span>
              </div>
              <h3 className="mt-2 font-heading text-base font-bold text-edito-navy">{selectedItem.name}</h3>
              <p className="mt-1 font-mono text-xs font-semibold text-edito-petrol">
                Échéance : {formatRegulatoryDate(selectedItem.deadlineDate)}
              </p>
            </div>

            {selectedItem.description ? (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-edito-muted">Description</h4>
                <p className="mt-1 text-xs leading-relaxed text-edito-body">{selectedItem.description}</p>
              </div>
            ) : null}

            {selectedItem.commercialAngle ? (
              <div className="rounded-lg border border-edito-brass/40 bg-edito-brass/5 p-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-edito-brass">Angle d’opportunité commerciale</h4>
                <p className="mt-1 text-xs leading-relaxed text-edito-navy">{selectedItem.commercialAngle}</p>
              </div>
            ) : null}

            <dl className="grid grid-cols-2 gap-3 border-t border-edito-border pt-3 text-xs">
              <div>
                <dt className="text-edito-muted text-[10px]">Autorité compétente</dt>
                <dd className="font-semibold text-edito-navy">{selectedItem.authority ?? "Non renseignée"}</dd>
              </div>
              <div>
                <dt className="text-edito-muted text-[10px]">Practice Kredo</dt>
                <dd className="font-semibold text-edito-navy">{selectedItem.kredoPractice ?? "Transverse"}</dd>
              </div>
            </dl>

            {selectedItem.sourceUrl ? (
              <div className="border-t border-edito-border pt-3">
                <a
                  href={selectedItem.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center text-xs font-bold text-edito-petrol hover:underline"
                >
                  Consulter la source officielle ↗
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
