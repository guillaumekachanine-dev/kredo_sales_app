// ─────────────────────────────────────────────────────────────────────────────
//  Consultants › Pool de compétences
//
//  Présentation des compétences clés de l'entreprise :
//  catégorisation, notation des collaborateurs, passerelles métiers,
//  évolutions possibles…
//
//  Contenu à implémenter dans une prochaine phase.
// ─────────────────────────────────────────────────────────────────────────────

export default function PoolCompetencesPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-bold font-heading tracking-tight text-heading">
          Pool de compétences
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compétences clés de l&apos;entreprise — catégorisation, notation, passerelles métiers et évolutions possibles.
        </p>
      </div>

      {/* Placeholder — contenu à venir */}
      <div className="flex items-center justify-center h-64 rounded-xl border border-dashed border-border bg-surface/50">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Onglet en cours de construction</p>
          <p className="text-xs text-muted-foreground/60">Le contenu sera ajouté prochainement.</p>
        </div>
      </div>
    </div>
  )
}
