import { cn } from "@/lib/utils"
import type { TerrainConfidenceModel } from "./terrain-home-model"

export function TerrainConfidenceBadge({
  confidence,
  className,
}: {
  confidence: TerrainConfidenceModel
  className?: string
}) {
  return (
    <section
      className={cn(
        "flex min-h-[27px] items-center gap-2 border-b border-edito-border pb-3 text-xs text-edito-body",
        className,
      )}
      aria-label="Confiance du corpus"
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          confidence.dotVariant === "success" && "bg-success",
          confidence.dotVariant === "warning" && "bg-warning",
          confidence.dotVariant === "danger" && "bg-danger",
          confidence.dotVariant === "neutral" && "bg-edito-muted",
        )}
        aria-hidden="true"
      />
      <strong className="font-bold text-edito-navy">{confidence.label}</strong>
      {confidence.detail ? (
        <span className="text-[11px] font-semibold text-edito-muted">· {confidence.detail}</span>
      ) : null}
    </section>
  )
}
