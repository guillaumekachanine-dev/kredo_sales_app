"use client"

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
}

export interface JournalLiveStatusProps {
  lastUpdatedAt: string
  isRefreshing: boolean
  refreshError: string | null
  onRefresh: () => void
}

// Horodatage + filet manuel. Sans ça, un journal figé (canal Realtime tombé,
// onglet resté ouvert une nuit) est indiscernable d'un journal simplement
// calme — c'est-à-dire du bug qu'on vient de corriger.
export function JournalLiveStatus({
  lastUpdatedAt,
  isRefreshing,
  refreshError,
  onRefresh,
}: JournalLiveStatusProps) {
  return (
    <div className="flex items-center gap-3">
      {refreshError ? (
        <span className="text-[10px] font-medium text-danger">{refreshError}</span>
      ) : (
        // Le rendu serveur formate en UTC, le client dans son fuseau : l'écart
        // est attendu et sans conséquence sur ce libellé.
        <span className="text-[10px] text-muted" suppressHydrationWarning>
          Mis à jour à {new Date(lastUpdatedAt).toLocaleTimeString("fr-FR", TIME_FORMAT)}
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="text-[10px] font-bold uppercase tracking-wider text-primary transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
      >
        {isRefreshing ? "Rafraîchissement…" : "Rafraîchir"}
      </button>
    </div>
  )
}
