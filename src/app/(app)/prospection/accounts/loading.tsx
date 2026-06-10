// Squelette tableau pour la route Comptes & Contacts (la plus dense en données).
// Affiché immédiatement le temps que les requêtes Supabase serveur reviennent.
export default function AccountsLoading() {
  return (
    <div className="p-6 animate-pulse" aria-busy="true" aria-label="Chargement des comptes…">
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 h-3 w-16 rounded bg-surface-hover" />
            <div className="h-6 w-12 rounded bg-surface-hover" />
          </div>
        ))}
      </div>

      {/* Barre d'outils */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-9 w-72 rounded bg-surface-hover" />
        <div className="h-9 w-28 rounded bg-surface-hover" />
        <div className="h-9 w-28 rounded bg-surface-hover" />
      </div>

      {/* Lignes du tableau */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="h-11 w-full border-b border-border bg-surface-hover/60" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-surface-hover" />
            <div className="h-4 flex-1 rounded bg-surface-hover" />
            <div className="h-4 w-24 rounded bg-surface-hover" />
            <div className="h-4 w-16 rounded bg-surface-hover" />
            <div className="h-7 w-20 rounded bg-surface-hover" />
          </div>
        ))}
      </div>
    </div>
  )
}
