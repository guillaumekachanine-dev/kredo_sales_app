import { BusinessIntelligencePeriodModel } from "../presenters/build-business-intelligence-desktop-model"

interface StrategicBriefProps {
  brief: BusinessIntelligencePeriodModel["strategicBrief"]
}


export function StrategicBrief({ brief }: StrategicBriefProps) {
  return (
    <section className="border-l-2 border-primary bg-surface px-5 py-5 sm:px-6">
      <h2 className="font-heading text-lg font-bold text-heading">Brief Stratégique</h2>
      <p className="mb-5 mt-2 max-w-4xl text-sm leading-relaxed text-body">
        Il y a actuellement <strong className="text-primary">{brief.openWindows} fenêtres ouvertes</strong> sur le marché.
        Nous identifions <strong className="text-danger">{brief.insufficientlyCoveredPriorityAccounts} comptes prioritaires</strong> qui manquent de couverture.
        {brief.bestSignalSector && (
          <span> Le secteur présentant le meilleur signal est actuellement <strong>{brief.bestSignalSector}</strong>.</span>
        )}
      </p>

      <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-3">
        <div>
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Compte à arbitrer</span>
          <span className="block text-sm font-medium text-heading">
            {brief.topArbitrationAccount ?? "Aucun compte critique"}
          </span>
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Fenêtre la plus chaude</span>
          <span className="block text-sm font-medium text-heading" title={brief.hottestWindow ?? ""}>
            {brief.hottestWindow ?? "Aucune fenêtre"}
          </span>
        </div>
        <div>
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Déficit principal</span>
          <span className="block text-sm font-medium text-danger">
            {brief.mainCoverageDeficit ?? "Couverture saine"}
          </span>
        </div>
      </div>
    </section>
  )
}
