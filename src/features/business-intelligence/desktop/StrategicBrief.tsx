import { BusinessIntelligencePeriodModel } from "../presenters/build-business-intelligence-desktop-model"

interface StrategicBriefProps {
  brief: BusinessIntelligencePeriodModel["strategicBrief"]
}


export function StrategicBrief({ brief }: StrategicBriefProps) {
  return (
    <section className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)] shadow-sm">
      <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-3">Brief Stratégique</h2>
      <p className="text-sm text-[var(--color-text-main)] leading-relaxed mb-6">
        Il y a actuellement <strong className="text-[var(--color-dataviz-1)]">{brief.openWindows} fenêtres ouvertes</strong> sur le marché. 
        Nous identifions <strong className="text-[var(--color-error)]">{brief.insufficientlyCoveredPriorityAccounts} comptes prioritaires</strong> qui manquent de couverture. 
        {brief.bestSignalSector && (
          <span> Le secteur présentant le meilleur signal est actuellement <strong>{brief.bestSignalSector}</strong>.</span>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[var(--color-border)] pt-4">
        <div>
          <span className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Compte à arbitrer</span>
          <span className="block text-sm font-medium text-[var(--color-text-main)]">
            {brief.topArbitrationAccount ?? "Aucun compte critique"}
          </span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Fenêtre la plus chaude</span>
          <span className="block text-sm font-medium text-[var(--color-text-main)] truncate" title={brief.hottestWindow ?? ""}>
            {brief.hottestWindow ?? "Aucune fenêtre"}
          </span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-wider text-[var(--color-muted)] mb-1">Déficit principal</span>
          <span className="block text-sm font-medium text-[var(--color-error)]">
            {brief.mainCoverageDeficit ?? "Couverture saine"}
          </span>
        </div>
      </div>
    </section>
  )
}
