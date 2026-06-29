import type { IntelligenceAction } from "@/lib/intelligence/intelligence-registry"
import { IntelligenceIcon } from "./intelligence-icons"
import { cn } from "@/lib/utils"

interface IntelligenceActionCardProps {
  action: IntelligenceAction
  tone?: "dark" | "light"
}

export function IntelligenceActionCard({ action, tone = "dark" }: IntelligenceActionCardProps) {
  const isDark = tone === "dark"
  const isComingSoon = action.status === "coming_soon"

  if (isDark) {
    return (
      <button
        type="button"
        onClick={isComingSoon ? undefined : undefined}
        className={cn(
          "kredo-action-card-dark group relative flex flex-col items-start gap-2 rounded-lg p-3 text-left cursor-pointer",
        )}
      >
        {/* Badge "Bientôt" discret en superposition */}
        {isComingSoon && (
          <span className="absolute top-2 right-2 z-20 rounded-full bg-white/10 px-1.5 py-px text-[7px] font-bold uppercase tracking-widest text-white/50">
            Bientôt
          </span>
        )}

        <div className="relative z-10">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-white/20 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.25),inset_0_1px_0_rgba(255,255,255,0.30)]">
            <IntelligenceIcon name={action.icon} className="size-5 text-white" />
          </span>
        </div>

        <div className="relative z-10 min-w-0">
          <p className="text-xs font-semibold leading-tight text-white">
            {action.label}
          </p>
        </div>
      </button>
    )
  }

  // Light tone (mobile drawer)
  return (
    <button
      type="button"
      disabled={isComingSoon}
      className={cn(
        "group relative flex flex-col items-start gap-2 rounded-lg border border-border bg-surface p-3 text-left transition-all",
        isComingSoon
          ? "cursor-default opacity-60"
          : "cursor-pointer hover:bg-surface-hover active:scale-[0.97]",
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <IntelligenceIcon name={action.icon} className="size-4" />
        </span>

        {isComingSoon && (
          <span className="shrink-0 rounded-full border border-border bg-canvas px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted">
            Bientôt
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold leading-tight text-heading">
          {action.label}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted">
          {action.description}
        </p>
      </div>
    </button>
  )
}
