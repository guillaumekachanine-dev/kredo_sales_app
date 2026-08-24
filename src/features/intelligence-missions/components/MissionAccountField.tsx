"use client"

import { useMemo } from "react"
import { AccountCombobox, type AccountValue } from "@/components/missions/AccountCombobox"
import { useIntelligenceContext } from "@/hooks/use-intelligence-context"
import { resolveInitialAccountSelection } from "./mission-composer-model"

interface MissionAccountFieldProps {
  value?: AccountValue | null
  onChange: (account: AccountValue | null) => void
  disabled?: boolean
  variant?: "desktop" | "mobile"
  id?: string
}

export function MissionAccountField({
  value,
  onChange,
  disabled = false,
  variant = "desktop",
  id,
}: MissionAccountFieldProps) {
  const isMobile = variant === "mobile"
  const fieldId = id ?? (isMobile ? "mission-account-mobile" : "mission-account-desktop")

  const entityContext = useIntelligenceContext((state) => state.entityContext)
  const initialValue = useMemo(() => resolveInitialAccountSelection(entityContext), [entityContext])

  const currentValue = value !== undefined ? value : initialValue

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
        Compte client
      </label>
      <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
        <AccountCombobox
          value={currentValue}
          onChange={onChange}
          allowCreate={false}
          openOnFocus
          minSearchLength={0}
          searchLimit={16}
          size={isMobile ? "md" : "sm"}
          className={
            isMobile
              ? "min-h-12 border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40"
              : "border-primary-fg/15 bg-primary-fg/[0.06] text-primary-fg placeholder:text-primary-fg/40 focus:border-primary-fg/40"
          }
        />
      </div>
    </div>
  )
}
