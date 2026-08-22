import { cn } from "@/lib/utils"
import type { TerrainRegulatoryModel } from "./terrain-home-model"

export function TerrainRegulatoryCard({
  item,
  className,
}: {
  item: TerrainRegulatoryModel
  className?: string
}) {
  const timing = item.timing
  const isExact = timing.kind === "exact"
  const isWindow = timing.kind === "window"

  return (
    <section
      className={cn(
        "rounded-xl border p-4 shadow-sm transition-colors",
        isExact
          ? "border-edito-navy bg-edito-navy text-edito-surface"
          : "border-edito-border bg-edito-surface text-edito-navy",
        className,
      )}
      aria-label="Prochaine échéance réglementaire"
    >
      <p
        className={cn(
          "text-[10px] font-extrabold uppercase tracking-[0.14em]",
          isExact ? "text-white/75" : "text-edito-muted",
        )}
      >
        Prochaine échéance
      </p>

      <h2
        className={cn(
          "mt-2 font-heading font-bold tracking-tight leading-tight",
          isExact ? "text-2xl text-white" : isWindow ? "text-2xl text-edito-navy" : "text-lg text-edito-navy",
        )}
      >
        {item.name}
      </h2>

      {timing.kind === "exact" ? (
        <>
          <span className="mt-1 block text-xs text-white/80">Échéance vérifiée</span>
          <div className="mt-4 flex items-end justify-between gap-3">
            <strong className="font-heading text-xl font-bold uppercase tracking-tight text-white">
              {timing.formattedDate}
            </strong>
            {timing.countdown ? (
              <span className="shrink-0 rounded-full bg-edito-gold px-2.5 py-1 text-[11px] font-extrabold text-edito-ink shadow-sm">
                {timing.countdown}
              </span>
            ) : null}
          </div>
        </>
      ) : timing.kind === "window" ? (
        <>
          <span className="mt-1 block text-xs text-edito-muted">Notification attendue</span>
          <strong className="mt-3 block font-heading text-xl font-bold uppercase tracking-tight text-edito-navy">
            {timing.label}
          </strong>
        </>
      ) : (
        <p className="mt-2 text-xs text-edito-muted italic">
          Échéance non disponible dans le corpus courant.
        </p>
      )}
    </section>
  )
}
