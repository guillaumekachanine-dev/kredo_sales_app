export function AutomationMetricsNavigation() {
  return (
    <nav aria-label="Sections d’analyse des métriques" className="space-y-2 p-4">
      <div className="flex w-full items-center gap-3 rounded-xl border border-brand-brass/40 bg-brand-brass/10 px-3 py-3 text-left text-white">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-brass/20 text-sm text-brand-brass" aria-hidden="true">◫</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold">Vue d’ensemble</span>
          <span className="mt-0.5 block text-[10px] leading-snug text-white/50">Volumes, succès et tendance globale</span>
        </span>
        <span className="text-sm text-brand-brass" aria-hidden="true">›</span>
      </div>
    </nav>
  )
}
