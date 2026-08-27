"use client"

import { cn } from "@/lib/utils"

export function CockpitReturnButton({
  onClick,
  tone = "light",
  hideLabelOnMobile = false,
  className,
}: {
  onClick: () => void
  tone?: "light" | "dark"
  hideLabelOnMobile?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-small)] px-2 text-xs font-bold transition-colors cursor-pointer",
        tone === "dark"
          ? "text-white/85 hover:bg-white/10 hover:text-white"
          : "text-primary hover:bg-primary/8",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className="size-4 shrink-0 text-primary" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15 19-7-7 7-7" />
      </svg>
      <span className={cn(hideLabelOnMobile && "max-sm:hidden")}>Retour au cockpit</span>
    </button>
  )
}
