"use client"

// Filet de sécurité racine : capture toute erreur non rattrapée survenant dans
// le layout racine lui-même. Doit rendre ses propres <html>/<body> car il
// remplace intégralement le layout défaillant. Volontairement minimal (aucune
// dépendance au shell applicatif, qui peut être la source du crash).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-surface p-6 text-center">
        <p className="text-lg font-semibold text-heading">Une erreur est survenue</p>
        <p className="max-w-sm text-sm text-muted">
          L’application a rencontré un problème inattendu. Vous pouvez réessayer ;
          si le problème persiste, rechargez la page.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted">Référence&nbsp;: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
        >
          Réessayer
        </button>
      </body>
    </html>
  )
}
