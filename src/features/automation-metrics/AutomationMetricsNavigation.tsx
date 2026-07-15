import type { AutomationMetricsSectionId } from "./automation-metrics-types"

const SECTIONS: Array<{ id: AutomationMetricsSectionId; title: string; description: string; icon: string }> = [
  { id: "overview", title: "Vue d’ensemble", description: "Volumes, succès et tendance globale", icon: "◫" },
  { id: "reliability", title: "Fiabilité", description: "Succès et échecs par workflow", icon: "◌" },
  { id: "performance", title: "Performance", description: "Latences médianes et dégradées", icon: "↗" },
]

export function AutomationMetricsNavigation({
  section,
  onChange,
}: {
  section: AutomationMetricsSectionId
  onChange: (section: AutomationMetricsSectionId) => void
}) {
  return (
    <nav aria-label="Sections d’analyse des métriques" className="space-y-2 p-4">
      {SECTIONS.map((item) => {
        const active = item.id === section
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={active ? "page" : undefined}
            className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 ${active ? "border-brand-brass/40 bg-brand-brass/10 text-white" : "border-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"}`}
          >
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm ${active ? "bg-brand-brass/20 text-brand-brass" : "bg-white/[0.05] text-white/60"}`} aria-hidden="true">{item.icon}</span>
            <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold">{item.title}</span><span className="mt-0.5 block text-[10px] leading-snug text-white/50">{item.description}</span></span>
            <span className={`text-sm transition-transform duration-200 ${active ? "translate-x-0 text-brand-brass" : "text-white/30 group-hover:translate-x-0.5"}`} aria-hidden="true">›</span>
          </button>
        )
      })}
    </nav>
  )
}
