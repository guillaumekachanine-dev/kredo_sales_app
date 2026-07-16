// Squelette dédié à la bibliothèque Rapports & Rédaction.
//
// La page /reports rend sur un canvas SOMBRE (`data-theme="intelligence-reports"`).
// Sans ce squelette dédié, la navigation afficherait d'abord le squelette racine
// (clair) puis basculerait en sombre — un flash de thème visible. On enveloppe
// donc le squelette dans le même thème : les tokens (`bg-surface`, `border-border`…)
// résolvent alors vers la palette sombre, sans transition disgracieuse.
export default function ReportsLoading() {
  return (
    <div
      data-theme="intelligence-reports"
      className="min-h-screen bg-canvas p-4 sm:p-6 animate-pulse text-body"
      aria-busy="true"
      aria-label="Chargement de la bibliothèque…"
    >
      {/* En-tête */}
      <div className="mb-5 space-y-3 sm:mb-6">
        <div className="h-6 w-48 rounded bg-surface-hover sm:h-7 sm:w-64" />
        <div className="h-4 w-40 rounded bg-surface-hover sm:w-72" />
      </div>

      {/* KPI compacts */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 h-3 w-14 rounded bg-surface-hover" />
            <div className="h-6 w-16 rounded bg-surface-hover" />
          </div>
        ))}
      </div>

      {/* Grille de cartes documents */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex aspect-[1.1] flex-col justify-between rounded-2xl border border-border bg-surface p-5"
          >
            <div className="size-8 rounded-lg bg-surface-hover" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 rounded bg-surface-hover" />
              <div className="h-3 w-1/2 rounded bg-surface-hover" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
