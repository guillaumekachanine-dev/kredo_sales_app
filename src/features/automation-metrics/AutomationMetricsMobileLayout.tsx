"use client"

import type { ReactNode } from "react"
import { AutomationMetricsMobileNavigation } from "./AutomationMetricsMobileNavigation"
import type { AutomationMetricsSectionId } from "./automation-metrics-types"

export function AutomationMetricsMobileLayout({
  section,
  onSectionChange,
  filters,
  pending,
  children,
}: {
  section: AutomationMetricsSectionId
  onSectionChange: (section: AutomationMetricsSectionId) => void
  filters: ReactNode
  pending: boolean
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
      <AutomationMetricsMobileNavigation section={section} onChange={onSectionChange} />
      {filters}
      <div
        id="automation-metrics-mobile-panel"
        role="tabpanel"
        aria-labelledby={`automation-metrics-mobile-tab-${section}`}
        aria-busy={pending || undefined}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-slate-950/20"
      >
        {children}
      </div>
    </div>
  )
}
