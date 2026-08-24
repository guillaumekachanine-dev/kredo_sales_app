import { BusinessIntelligencePeriodModel } from "../presenters/build-business-intelligence-desktop-model"

interface IntelligenceKpiStripProps {
  kpis: BusinessIntelligencePeriodModel["kpis"]
}


export function IntelligenceKpiStrip({ kpis }: IntelligenceKpiStripProps) {
  const items = [
    { label: "Comptes prioritaires", value: kpis.priorityAccountsCount },
    { label: "Fenêtres ouvertes", value: kpis.openWindowsCount },
    { label: "Secteurs actifs", value: kpis.activeSectorsCount },
  ]

  return (
    <section aria-label="Indicateurs clés" className="grid divide-y divide-border/30 rounded-xl border border-border/30 bg-surface/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-4 lg:px-5">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{item.label}</span>
          <span className="mt-1 block font-heading text-2xl font-bold text-body">{item.value}</span>
        </div>
      ))}
    </section>
  )
}
