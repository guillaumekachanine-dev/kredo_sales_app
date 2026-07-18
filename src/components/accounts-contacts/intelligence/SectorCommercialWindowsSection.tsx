import { Badge } from "@/components/ui/Badge"
import type { SectorCommercialWindowView } from "@/lib/intelligence/client-intelligence-sector"
import { SectionBlock } from "./intelligence-parts"

type SectorCommercialWindowsSectionProps = {
  windows: SectorCommercialWindowView[]
}

const URGENCY_LABELS: Record<string, string> = {
  critical: "Critique",
  high: "Forte",
  medium: "Normale",
  low: "Faible",
}

function formatDate(value: string | null): string {
  if (!value) return "Sans date de clôture"
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
}

export function SectorCommercialWindowsSection({ windows }: SectorCommercialWindowsSectionProps) {
  return (
    <SectionBlock title="Fenêtres commerciales ouvertes" action={<span className="text-[10px] font-semibold text-white/75">{windows.length} ouvertes</span>} className="h-full border-brand-brass/45 bg-brand-brass/[0.025]">
      <p className="border-l-2 border-brand-brass pl-3 text-xs font-medium leading-relaxed text-heading">
        Uniquement les opportunités explicitement qualifiées par KREDO et non expirées.
      </p>
      {windows.length > 0 ? (
        <ol className="mt-4 flex flex-col gap-4">
          {windows.map((item) => (
            <li key={item.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={item.urgency === "critical" ? "danger" : item.urgency === "high" ? "warning" : "brand"}>
                  {URGENCY_LABELS[item.urgency] ?? item.urgency}
                </Badge>
                {item.kredoPractice ? <Badge variant="brass">{item.kredoPractice}</Badge> : null}
              </div>
              <h4 className="mt-2 text-sm font-bold leading-snug text-heading">{item.title}</h4>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">Échéance · {formatDate(item.deadlineDate)}</p>
              {item.reason ? <p className="mt-2 text-xs leading-relaxed text-body">{item.reason}</p> : null}
              {item.commercialAngle ? <p className="mt-2 text-xs font-semibold leading-relaxed text-heading">Angle commercial · {item.commercialAngle}</p> : null}
              {item.sourceUrl ? (
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex min-h-11 items-center text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  Source réglementaire
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-xs italic text-muted">Aucune fenêtre commerciale explicitement ouverte à ce jour.</p>
      )}
    </SectionBlock>
  )
}
