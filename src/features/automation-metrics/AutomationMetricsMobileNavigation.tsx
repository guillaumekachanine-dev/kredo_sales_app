"use client"

import { AUTOMATION_METRICS_SECTIONS } from "./automation-metrics-navigation"
import type { AutomationMetricsSectionId } from "./automation-metrics-types"

export function AutomationMetricsMobileNavigation({
  section,
  onChange,
}: {
  section: AutomationMetricsSectionId
  onChange: (section: AutomationMetricsSectionId) => void
}) {
  return (
    <nav aria-label="Sections d’analyse des métriques" className="shrink-0 border-b border-white/5">
      <div role="tablist" aria-label="Analyses disponibles" className="flex overflow-x-auto overscroll-x-contain px-2 py-1.5 [scrollbar-width:thin]">
        {AUTOMATION_METRICS_SECTIONS.map((item) => {
          const active = item.id === section
          return (
            <button
              key={item.id}
              id={`automation-metrics-mobile-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="automation-metrics-mobile-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(event) => {
                const currentIndex = AUTOMATION_METRICS_SECTIONS.findIndex((sectionItem) => sectionItem.id === item.id)
                const lastIndex = AUTOMATION_METRICS_SECTIONS.length - 1
                const nextIndex = event.key === "ArrowRight"
                  ? (currentIndex + 1) % AUTOMATION_METRICS_SECTIONS.length
                  : event.key === "ArrowLeft"
                    ? (currentIndex - 1 + AUTOMATION_METRICS_SECTIONS.length) % AUTOMATION_METRICS_SECTIONS.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? lastIndex
                        : null
                if (nextIndex === null) return
                event.preventDefault()
                onChange(AUTOMATION_METRICS_SECTIONS[nextIndex].id)
                const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                tabs?.[nextIndex]?.focus()
              }}
              className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass/50 motion-reduce:transition-none ${active ? "border-brand-brass/35 bg-brand-brass/10 text-white" : "border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white"}`}
            >
              {item.mobileTitle}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
