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
    <div className="flex items-center gap-2.5">
      {refreshError ? (
        <span className="text-[10px] font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded border border-danger/20">
          {refreshError}
        </span>
      ) : (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas/80 border border-border/60 text-[10px] text-muted shadow-2xs" suppressHydrationWarning>
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
          </span>
          <span>Dernière synchro à <strong className="text-heading font-mono">{new Date(lastUpdatedAt).toLocaleTimeString("fr-FR", TIME_FORMAT)}</strong></span>
        </div>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-edito-navy text-white text-[11px] font-semibold hover:bg-edito-navy/90 active:scale-95 transition-all shadow-2xs disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        <svg
          className={`size-3 shrink-0 transition-transform ${isRefreshing ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>{isRefreshing ? "Synchronisation…" : "Rafraîchir"}</span>
      </button>
    </div>
  )
}

