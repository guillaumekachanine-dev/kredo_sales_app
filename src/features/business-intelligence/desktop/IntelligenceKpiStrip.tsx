import { BusinessIntelligenceDesktopViewModel } from "../presenters/build-business-intelligence-desktop-model"

interface IntelligenceKpiStripProps {
  kpis: BusinessIntelligenceDesktopViewModel["kpis"]
}

export function IntelligenceKpiStrip({ kpis }: IntelligenceKpiStripProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] shadow-sm">
        <span className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Comptes prioritaires</span>
        <span className="block text-2xl font-bold text-[var(--color-text-main)]">{kpis.priorityAccountsCount}</span>
      </div>
      
      <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] shadow-sm">
        <span className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Fenêtres ouvertes</span>
        <span className="block text-2xl font-bold text-[var(--color-dataviz-1)]">{kpis.openWindowsCount}</span>
      </div>

      <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] shadow-sm">
        <span className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Secteurs actifs</span>
        <span className="block text-2xl font-bold text-[var(--color-text-main)]">{kpis.activeSectorsCount}</span>
      </div>

      <div className="bg-[var(--color-surface)] p-4 rounded-lg border border-[var(--color-border)] shadow-sm">
        <span className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Confiance moyenne</span>
        <span className="block text-2xl font-bold text-[var(--color-text-main)]" title="Confiance moyenne des scores natifs">
          {kpis.averageConfidence !== null ? `${kpis.averageConfidence}%` : "N/A"}
        </span>
      </div>
    </div>
  )
}
