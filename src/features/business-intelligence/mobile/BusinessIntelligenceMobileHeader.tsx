"use client"

import { HeaderAlerts } from "@/components/ui/HeaderAlerts"
import type { BusinessIntelligenceMobilePeriod } from "../presenters/build-business-intelligence-mobile-model"

export function BusinessIntelligenceMobileHeader({
  period,
  onPeriodChange,
}: {
  period: BusinessIntelligenceMobilePeriod
  onPeriodChange: (period: BusinessIntelligenceMobilePeriod) => void
}) {
  const periods: BusinessIntelligenceMobilePeriod[] = [30, 90, 180]

  return (
    <header className="border-b border-white/10 bg-[#0b1730] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-white">Business Intelligence</h1>
          <p className="mt-1 max-w-[270px] text-xs leading-relaxed text-white/60">Décider et agir sur les comptes prioritaires</p>
        </div>
        <HeaderAlerts />
      </div>
      <div className="mt-4 grid grid-cols-3 rounded-xl border border-white/10 bg-[#071126] p-1" role="group" aria-label="Période d'analyse">
        {periods.map((value) => {
          const selected = value === period
          return (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              aria-pressed={selected}
              className={`min-h-11 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none ${selected ? "bg-brand-brass text-[#10172a]" : "text-white/60 hover:bg-white/[0.05] hover:text-white"}`}
            >
              {value} jours
            </button>
          )
        })}
      </div>
    </header>
  )
}
