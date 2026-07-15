"use client"

// Filet de sécurité de segment : capture les erreurs de rendu des pages (app)
// tout en conservant le shell applicatif (sidebar/nav). Rendu dans la zone de
// contenu, pas de <html>/<body>.
export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60dvh] w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-semibold text-heading">Cette section n’a pas pu s’afficher</p>
      <p className="max-w-sm text-sm text-muted">
        Une erreur est survenue lors du chargement de cette page. Réessayez ;
        les autres sections restent accessibles.
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
    </div>
  )
}
