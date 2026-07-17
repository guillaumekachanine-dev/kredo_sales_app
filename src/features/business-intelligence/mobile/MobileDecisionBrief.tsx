import type { BusinessIntelligenceMobileAccount, BusinessIntelligenceMobilePeriodModel } from "../presenters/build-business-intelligence-mobile-model"

export function MobileDecisionBrief({
  account,
  period,
}: {
  account: BusinessIntelligenceMobileAccount | null
  period: BusinessIntelligenceMobilePeriodModel
}) {
  if (!account) {
    return <EmptyPanel title="Aucun compte prioritaire" description="Aucune priorité ne ressort pour cette période." />
  }

  const whyNow = account.attack?.approachAngle ?? account.topSignal?.summary ?? "Signal à qualifier avant de déclencher une action."
  const nextAction = account.nextAction ?? account.attack?.nextAction

  return (
    <section aria-labelledby="mobile-decision-title" className="border-y border-white/10 bg-[#0d1c38] px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-brand-brass">Décision recommandée</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="mobile-decision-title" className="truncate text-xl font-bold text-white">{account.name}</h2>
          <p className="mt-1 text-xs text-white/60">{account.sectorName ?? "Secteur non renseigné"}</p>
        </div>
        <span className="shrink-0 rounded-lg border border-brand-brass/30 bg-brand-brass/10 px-2 py-1 text-xs font-bold text-brand-brass">{account.priority}</span>
      </div>
      <div className="mt-4 space-y-3 border-t border-white/10 pt-3 text-sm">
        <BriefRow label="Signal principal" value={account.topSignal?.title ?? "Signal indisponible"} />
        <BriefRow label="Pourquoi agir maintenant" value={whyNow} />
        <BriefRow label="Prochaine action" value={nextAction ?? "Action non déterminée"} muted={!nextAction} />
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-3">
        <Metric label="Comptes" value={period.metrics.priorityAccountsCount} />
        <Metric label="Fenêtres" value={period.metrics.openWindowsCount} />
        <Metric label="Confiance" value={period.metrics.averageConfidence === null ? "Indisponible" : `${period.metrics.averageConfidence}%`} />
      </div>
    </section>
  )
}

function BriefRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/45">{label}</p><p className={`mt-1 leading-snug ${muted ? "text-white/45 italic" : "text-white/85"}`}>{value}</p></div>
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-0 px-2 first:pl-0 last:pr-0"><p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p><p className="mt-1 truncate text-sm font-bold text-white">{value}</p></div>
}

export function EmptyPanel({ title, description }: { title: string; description: string }) {
  return <section className="mx-4 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center"><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-2 text-xs leading-relaxed text-white/55">{description}</p></section>
}
