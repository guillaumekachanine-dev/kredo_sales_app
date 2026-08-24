"use client"

import { Input } from "@/components/ui/Input"

interface MissionMonthFieldProps {
  value: string
  onChange: (month: string) => void
  disabled?: boolean
  variant?: "desktop" | "mobile"
  id?: string
}

export function MissionMonthField({
  value,
  onChange,
  disabled = false,
  variant = "desktop",
  id,
}: MissionMonthFieldProps) {
  const isMobile = variant === "mobile"
  const fieldId = id ?? (isMobile ? "mission-period-mobile" : "mission-period-desktop")

  return (
    <div className="space-y-2">
      <label
        htmlFor={fieldId}
        className={
          isMobile
            ? "text-xs font-bold text-white/80"
            : "text-[10px] font-bold uppercase tracking-[0.14em] text-primary-fg/55"
        }
      >
        {isMobile ? "Mois analysé" : "Période analysée"}
      </label>
      <Input
        id={fieldId}
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        fullWidth
        className={
          isMobile
            ? "min-h-12 border-white/20 bg-white/10 text-white [color-scheme:dark]"
            : "border-primary-fg/15 bg-primary-fg/[0.06] text-primary-fg [color-scheme:dark]"
        }
      />
    </div>
  )
}
