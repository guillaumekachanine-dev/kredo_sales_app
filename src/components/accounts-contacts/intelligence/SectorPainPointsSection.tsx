import { Badge } from "@/components/ui/Badge"
import type { SectorPainPointView } from "@/lib/intelligence/client-intelligence-sector"
import { SectionBlock } from "./intelligence-parts"

type SectorPainPointsSectionProps = {
  painPoints: SectorPainPointView[]
}

export function SectorPainPointsSection({ painPoints }: SectorPainPointsSectionProps) {
  const maxFrequency = Math.max(1, ...painPoints.map((item) => item.frequency))

  return (
    <SectionBlock title="Pain points sectoriels" action={<span className="text-[10px] font-semibold text-white/75">{painPoints.length} documentés</span>} className="h-full">
      {painPoints.length > 0 ? (
        <ol className="flex flex-col gap-4">
          {painPoints.map((item) => {
            const intensity = Math.max(4, Math.round((item.frequency / maxFrequency) * 100))
            return (
              <li key={item.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold leading-snug text-heading">{item.title}</h4>
                  <Badge variant="neutral">{item.frequency}×</Badge>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas" aria-label={`Intensité ${item.frequency} sur ${maxFrequency}`}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${intensity}%` }} />
                </div>
                {item.description ? <p className="mt-2 text-xs leading-relaxed text-body">{item.description}</p> : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.kredoPractice ? <Badge variant="brand">Practice · {item.kredoPractice}</Badge> : null}
                  {item.affectedSegments.map((segment) => <Badge key={segment} variant="neutral">{segment}</Badge>)}
                </div>
                {item.commercialAngle ? (
                  <p className="mt-2 border-l-2 border-brand-brass pl-2 text-xs font-medium leading-relaxed text-heading">
                    Angle commercial · {item.commercialAngle}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-xs italic text-muted">Aucun pain point sectoriel documenté.</p>
      )}
    </SectionBlock>
  )
}
