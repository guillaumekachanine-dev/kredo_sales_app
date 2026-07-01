import { Badge } from "@/components/ui/Badge"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import { cn } from "@/lib/utils"
import {
  formatAgendaDateLabel,
  getAgendaBusinessStatusLabel,
  type AgendaAllDayPlacement,
  type AgendaDesktopVisibleDay,
} from "./agenda-desktop-model"

interface AgendaAllDayLaneProps {
  visibleDays: AgendaDesktopVisibleDay[]
  placements: AgendaAllDayPlacement[]
  overflowByDay: Record<string, number>
  timezone: string
  onItemClick: (placement: AgendaAllDayPlacement) => void
}

function getAccent(placement: AgendaAllDayPlacement) {
  if (placement.item.type === "availability_block") {
    return placement.item.blockKind === "absence" ? "warning" : "danger"
  }

  return placement.item.businessStatus === "cancelled" ? "none" : "primary"
}

export function AgendaAllDayLane({
  visibleDays,
  placements,
  overflowByDay,
  timezone,
  onItemClick,
}: AgendaAllDayLaneProps) {
  const visiblePlacements = placements.filter((placement) => !placement.hidden)
  const rowCount = Math.max(1, Math.min(3, visiblePlacements.reduce((max, placement) => Math.max(max, placement.row + 1), 1)))

  return (
    <section className="overflow-hidden rounded-[var(--radius-large)] border border-border bg-surface">
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] border-b border-border bg-canvas/60">
        <div className="border-r border-border px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          All-day
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
        >
          {visibleDays.map((day) => (
            <div
              key={day.date}
              className={cn(
                "border-r border-border px-3 py-2 last:border-r-0",
                day.isToday && "bg-primary/[0.04]",
              )}
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {day.shortLabel}
              </div>
              <div className="text-sm font-semibold text-heading">
                {day.dayNumber}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[5rem_minmax(0,1fr)]">
        <div className="border-r border-border px-3 py-3 text-[11px] text-muted">
          Toute la journée
        </div>
        <div className="px-2 py-2">
          <div
            className="relative grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rowCount}, minmax(0, 2rem))`,
              minHeight: `${rowCount * 2.5}rem`,
            }}
          >
            {visibleDays.map((day) => (
              <div
                key={`bg-${day.date}`}
                className={cn(
                  "rounded-[var(--radius-medium)] bg-canvas/40",
                  day.isToday && "bg-primary/[0.05]",
                )}
              />
            ))}

            {visiblePlacements.map((placement) => (
              <button
                key={placement.id}
                type="button"
                onClick={() => onItemClick(placement)}
                className="z-10 cursor-pointer text-left"
                style={{
                  gridColumn: `${placement.startColumn + 1} / ${placement.endColumn + 2}`,
                  gridRow: `${placement.row + 1}`,
                }}
              >
                <SurfaceCard
                  accent={getAccent(placement)}
                  interactive
                  radius="md"
                  className={cn(
                    "h-8 border px-2.5 py-1.5",
                    placement.item.businessStatus === "cancelled" && "border-border bg-canvas",
                  )}
                  title={`${placement.item.title} · ${formatAgendaDateLabel(placement.item, timezone)}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[12px] font-medium text-heading">
                      {placement.item.title}
                    </span>
                    {placement.item.type === "availability_block" ? (
                      <Badge variant={placement.item.blockKind === "absence" ? "warning" : "danger"} size="sm">
                        {placement.item.blockKind === "absence" ? "Absence" : "Fermeture"}
                      </Badge>
                    ) : null}
                    {(placement.item.businessStatus === "cancelled" || placement.item.businessStatus === "completed") ? (
                      <Badge variant="neutral" size="sm">
                        {getAgendaBusinessStatusLabel(placement.item)}
                      </Badge>
                    ) : null}
                  </div>
                </SurfaceCard>
              </button>
            ))}
          </div>

          <div
            className="mt-2 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
          >
            {visibleDays.map((day) => {
              const overflow = overflowByDay[day.date] ?? 0
              return (
                <div key={`overflow-${day.date}`} className="min-h-5">
                  {overflow > 0 ? (
                    <span className="text-[11px] font-medium text-muted">
                      +{overflow} supplémentaire{overflow > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>

          {visiblePlacements.length === 0 ? (
            <div className="py-3 text-[12px] text-muted">
              Aucune plage all-day sur la période.
            </div>
          ) : null}

          {visiblePlacements.length > 0 ? (
            <p className="mt-2 text-[11px] text-muted">
              Les absences, fermetures client et événements multi-jours restent visibles sans encombrer la grille horaire.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
