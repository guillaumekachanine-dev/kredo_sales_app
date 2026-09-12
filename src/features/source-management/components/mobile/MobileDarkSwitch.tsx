"use client"

import { cn } from "@/lib/utils"

export interface MobileDarkSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label: string
  className?: string
}

export function MobileDarkSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  className,
}: MobileDarkSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex size-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center cursor-pointer focus-visible:outline-none",
        disabled && "cursor-not-allowed opacity-40",
        className,
      )}
    >
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-brass/60",
          checked ? "border-brand-brass bg-brand-brass" : "border-white/20 bg-white/10",
        )}
      >
        <span
          className={cn(
            "block size-3.5 rounded-full shadow-sm transition-transform duration-200 motion-reduce:transition-none",
            checked ? "translate-x-[17px] bg-[#0f122c]" : "translate-x-0.5 bg-white",
          )}
        />
      </span>
    </button>
  )
}
