import { BusinessIntelligencePeriodModel } from "../presenters/build-business-intelligence-desktop-model"

interface IntelligenceKpiStripProps {
  kpis: BusinessIntelligencePeriodModel["kpis"]
}


export function IntelligenceKpiStrip({ kpis }: IntelligenceKpiStripProps) {
  const items = [
    { label: "Comptes prioritaires", value: kpis.priorityAccountsCount },
    { label: "Fenêtres ouvertes", value: kpis.openWindowsCount },
    { label: "Secteurs actifs", value: kpis.activeSectorsCount },
    { label: "Confiance moyenne", value: kpis.averageConfidence !== null ? `${kpis.averageConfidence}%` : "N/A" },
  ]

  return (
    <section aria-label="Indicateurs clés" className="grid divide-y divide-border rounded-xl border border-border bg-surface sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-4 lg:px-5">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{item.label}</span>
          <span className="mt-1 block font-heading text-2xl font-bold text-heading">{item.value}</span>
        </div>
      ))}
    </section>
  )
}
