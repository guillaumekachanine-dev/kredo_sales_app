import type { IntelligenceAction } from "@/lib/intelligence/intelligence-registry"
import { openCommunicationComposer } from "@/lib/communication/communication-composer"
import { IntelligenceIcon } from "./intelligence-icons"
import { cn } from "@/lib/utils"

interface IntelligenceActionCardProps {
  action: IntelligenceAction
  tone?: "dark" | "light"
}

export function IntelligenceActionCard({ action, tone = "dark" }: IntelligenceActionCardProps) {
  const isDark = tone === "dark"
  const isWriteEmail = action.id === "common_write_email"
  const isComingSoon = action.status === "coming_soon" && !isWriteEmail

  function handleClick() {
    if (isWriteEmail) {
      openCommunicationComposer({ origin: "intelligence_common" })
    }
  }

  if (isDark) {
    return (
      <button
        type="button"
        onClick={isWriteEmail ? handleClick : undefined}
        className="kredo-action-card-dark group relative flex flex-col items-start gap-2 rounded-lg p-3 text-left cursor-pointer"
      >
        {isComingSoon && (
          <span className="absolute top-2 right-2 z-20 rounded-full bg-white/10 px-1.5 py-px text-[7px] font-bold uppercase tracking-widest text-white/50">
            Bientôt
          </span>
        )}

        <div className="relative z-10">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-white/20 text-white">
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

  return (
    <button
      type="button"
      disabled={isComingSoon}
      onClick={isWriteEmail ? handleClick : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl border border-slate-600/35 bg-slate-800/45 px-3 py-2 h-11 text-left transition-all w-full select-none",
        isComingSoon
          ? "cursor-default opacity-50"
          : "cursor-pointer hover:bg-slate-700/60 active:scale-[0.97]",
      )}
    >
      <span className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-100",
        isComingSoon ? "text-slate-100/40" : "text-slate-100",
      )}>
        <IntelligenceIcon name={action.icon} className="size-4" />
      </span>

      <span className="min-w-0 flex-1 truncate text-[11px] font-bold leading-tight text-slate-100">
        {action.label}
      </span>

      {isComingSoon && (
        <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white/50">
          Bientôt
        </span>
      )}
    </button>
  )
}
