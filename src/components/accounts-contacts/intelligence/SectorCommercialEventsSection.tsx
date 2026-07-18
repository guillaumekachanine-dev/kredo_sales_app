import { Badge } from "@/components/ui/Badge"
import type { SectorCommercialEventView } from "@/lib/intelligence/client-intelligence-sector"
import { SectionBlock } from "./intelligence-parts"

type SectorCommercialEventsSectionProps = {
  events: SectorCommercialEventView[]
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  regulatory: "Réglementaire",
  market: "Marché",
  competitor: "Concurrent",
  appointment: "Nomination",
  tender: "Appel d’offres",
  report: "Rapport",
  other: "Autre",
}

function formatDate(value: string | null): string {
  if (!value) return "Date à confirmer"
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}

export function SectorCommercialEventsSection({ events }: SectorCommercialEventsSectionProps) {
  const upcoming = events.filter((event) => event.timing !== "recent")
  const recent = events.filter((event) => event.timing === "recent")

  return (
    <SectionBlock title="Événements commerciaux" action={<span className="text-[10px] font-semibold text-white/75">{events.length} signaux</span>} className="h-full">
      {events.length > 0 ? (
        <div className="flex flex-col gap-5">
          <EventGroup title="À venir & à confirmer" events={upcoming} />
          <EventGroup title="Récents" events={recent} />
        </div>
      ) : (
        <p className="text-xs italic text-muted">Aucun événement commercial documenté.</p>
      )}
    </SectionBlock>
  )
}

function EventGroup({ title, events }: { title: string; events: SectorCommercialEventView[] }) {
  if (events.length === 0) return null
  return (
    <section>
      <h4 className="text-[10px] font-black uppercase tracking-wider text-heading">{title}</h4>
      <ol className="mt-2 flex flex-col gap-3">
        {events.map((event) => (
          <li key={event.id} className="border-l-2 border-primary/30 pl-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <time dateTime={event.eventDate ?? undefined} className="text-[10px] font-bold uppercase tracking-wider text-muted">{formatDate(event.eventDate)}</time>
              <Badge variant="neutral">{EVENT_TYPE_LABELS[event.eventType] ?? event.eventType}</Badge>
              {event.importance ? <Badge variant="brass">{event.importance}</Badge> : null}
            </div>
            <h5 className="mt-1 text-sm font-bold leading-snug text-heading">{event.title}</h5>
            {event.location ? <p className="mt-1 text-[11px] font-medium text-muted">{event.location}</p> : null}
            {event.description ? <p className="mt-1.5 text-xs leading-relaxed text-body">{event.description}</p> : null}
            {event.commercialOpportunity ? <p className="mt-1.5 text-xs font-medium leading-relaxed text-heading">Angle · {event.commercialOpportunity}</p> : null}
            {event.sourceUrl ? (
              <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex min-h-11 items-center text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                Source
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}
