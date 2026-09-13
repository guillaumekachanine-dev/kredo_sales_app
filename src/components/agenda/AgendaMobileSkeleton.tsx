// Squelette Mobile de l'Agenda : en-tête, bandeau de dates, flux d'événements —
// la forme de `AgendaMobileWorkspace`. Ex-`app/(app)/agenda/loading.tsx`, qui le
// servait AUSSI au Desktop avant de céder la place à `AgendaDesktopSkeleton`
// (audit d'ouverture des pages, O-3 : un squelette par device, un seul par route).
export function AgendaMobileSkeleton() {
  return (
    <div className="p-4 sm:p-6 animate-pulse" aria-busy="true" aria-label="Chargement de l'agenda…">
      {/* En-tête */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded bg-surface-hover sm:h-7 sm:w-48" />
          <div className="h-4 w-28 rounded bg-surface-hover sm:w-40" />
        </div>
        <div className="h-9 w-9 shrink-0 rounded-lg bg-surface-hover sm:w-28" />
      </div>

      {/* Bandeau de dates */}
      <div className="mb-5 flex gap-2 overflow-hidden sm:mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-16 w-12 shrink-0 rounded-xl border border-border bg-surface sm:w-16"
          />
        ))}
      </div>

      {/* Flux d'événements */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <div className="h-12 w-1 shrink-0 rounded-full bg-surface-hover" />
            <div className="min-w-0 flex-1 space-y-2.5 py-0.5">
              <div className="h-4 w-1/2 rounded bg-surface-hover" />
              <div className="h-3 w-2/3 rounded bg-surface-hover" />
            </div>
            <div className="h-5 w-16 shrink-0 rounded-full bg-surface-hover" />
          </div>
        ))}
      </div>
    </div>
  )
}
