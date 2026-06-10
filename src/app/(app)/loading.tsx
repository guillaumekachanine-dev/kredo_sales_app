// Squelette de section affiché INSTANTANÉMENT pendant le chargement du RSC.
// Couvre toutes les routes sous (app) qui n'ont pas leur propre loading.tsx.
// Objectif : feedback immédiat à chaque navigation (fluidité perçue).
export default function SectionLoading() {
  return (
    <div className="p-6 animate-pulse" aria-busy="true" aria-label="Chargement…">
      {/* En-tête */}
      <div className="mb-6 space-y-3">
        <div className="h-7 w-56 rounded bg-surface-hover" />
        <div className="h-4 w-80 rounded bg-surface-hover" />
      </div>

      {/* Bandeau KPI */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 h-3 w-20 rounded bg-surface-hover" />
            <div className="h-7 w-24 rounded bg-surface-hover" />
          </div>
        ))}
      </div>

      {/* Panneau principal */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4 h-5 w-40 rounded bg-surface-hover" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-surface-hover" />
          ))}
        </div>
      </div>
    </div>
  )
}
