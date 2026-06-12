// Squelette du Client Intelligence Hub, affiché le temps des requêtes serveur.
export default function ClientIntelligenceLoading() {
  return (
    <div data-theme="cockpit" className="flex h-full flex-col overflow-hidden bg-canvas" aria-busy="true" aria-label="Chargement de l'intelligence compte…">
      {/* Header */}
      <div className="animate-pulse border-b border-border bg-surface px-6 py-4">
        <div className="mb-3 h-3 w-32 rounded bg-surface-hover" />
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded bg-surface-hover" />
            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-surface-hover" />
              <div className="h-3 w-64 rounded bg-surface-hover" />
              <div className="h-4 w-40 rounded bg-surface-hover" />
            </div>
          </div>
          <div className="h-14 w-20 rounded bg-surface-hover" />
        </div>
      </div>

      {/* Onglets */}
      <div className="flex animate-pulse gap-3 border-b border-border bg-surface px-6 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-20 rounded bg-surface-hover" />
        ))}
      </div>

      {/* Corps */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 animate-pulse space-y-4 p-6">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-lg border border-border bg-surface" />
            ))}
          </div>
          <div className="h-40 rounded-lg border border-border bg-surface" />
          <div className="h-32 rounded-lg border border-border bg-surface" />
        </div>
        <div className="hidden w-80 animate-pulse space-y-4 border-l border-border bg-canvas/30 p-4 lg:block">
          <div className="h-40 rounded-lg border border-border bg-surface" />
          <div className="h-32 rounded-lg border border-border bg-surface" />
        </div>
      </div>
    </div>
  )
}
