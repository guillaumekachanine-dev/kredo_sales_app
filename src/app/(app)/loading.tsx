// Squelette de section affiché INSTANTANÉMENT pendant le chargement du RSC.
// Couvre toutes les routes sous (app) qui n'ont pas leur propre loading.tsx.
// Objectif : feedback immédiat à chaque navigation (fluidité perçue).
//
// Forme mobile-first (action-first) : sur petit écran, un empilement de cartes
// arrondies cohérent avec MobileActionPage ; sur desktop, la même trame passe en
// bandeau KPI + panneau dense grâce aux breakpoints — un seul squelette, zéro
// divergence à maintenir.
export default function SectionLoading() {
  return (
    <div className="p-4 sm:p-6 animate-pulse" aria-busy="true" aria-label="Chargement…">
      {/* En-tête */}
      <div className="mb-5 space-y-3 sm:mb-6">
        <div className="h-6 w-40 rounded bg-surface-hover sm:h-7 sm:w-56" />
        <div className="h-4 w-56 rounded bg-surface-hover sm:w-80" />
      </div>

      {/* Bandeau KPI — 2 colonnes en mobile, 4 en desktop */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <div className="mb-3 h-3 w-16 rounded bg-surface-hover sm:w-20" />
            <div className="h-6 w-20 rounded bg-surface-hover sm:h-7 sm:w-24" />
          </div>
        ))}
      </div>

      {/* Contenu principal — pile de cartes (action-first) plutôt qu'un tableau,
          lisible aussi bien en mobile qu'en desktop */}
      <div className="space-y-3 sm:space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <div className="size-11 shrink-0 rounded-xl bg-surface-hover" />
            <div className="min-w-0 flex-1 space-y-2.5 py-0.5">
              <div className="h-4 w-2/3 rounded bg-surface-hover" />
              <div className="h-3 w-1/2 rounded bg-surface-hover" />
            </div>
            <div className="h-6 w-14 shrink-0 rounded-full bg-surface-hover" />
          </div>
        ))}
      </div>
    </div>
  )
}
