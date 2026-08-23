export function BattleCardsEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
      <p className="font-semibold text-brand-brass">Aucune Battle Card disponible</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-white/55">
        Aucun acteur ou profil d’étude concurrentielle n’est encore associé à ce segment.
        Les Battle Cards sont projetées automatiquement dès qu’une cartographie concurrentielle est ingérée.
      </p>
    </div>
  )
}
