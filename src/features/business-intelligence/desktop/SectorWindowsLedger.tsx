"use client"

import { SectorActivationWindow } from "@/lib/prospection/sector-activation-types"

interface SectorWindowsLedgerProps {
  windows: SectorActivationWindow[]
  onSelectWindow: (window: SectorActivationWindow) => void
  limit?: number
  onShowAll?: () => void
}

export function SectorWindowsLedger({ windows, onSelectWindow, limit, onShowAll }: SectorWindowsLedgerProps) {
  const visibleWindows = limit ? windows.slice(0, limit) : windows

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="font-heading text-base font-bold text-heading">Fenêtres sectorielles</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-surface-hover/50 text-[10px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)]">Fenêtre</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)] hidden md:table-cell">Secteur</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)] hidden lg:table-cell">Source</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)] hidden sm:table-cell">Practice</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)] hidden xl:table-cell">Échéance</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)]">Urgence</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)] text-center">Comptes</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)] hidden 2xl:table-cell">Action suggérée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {windows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--color-muted)]">
                  Aucune fenêtre active détectée.
                </td>
              </tr>
            )}
            {visibleWindows.map((w) => (
              <tr 
                key={w.id} 
                className="cursor-pointer transition-colors hover:bg-surface-hover/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => onSelectWindow(w)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectWindow(w)
                  }
                }}
              >
                <td className="max-w-[200px] px-4 py-3 font-medium text-heading" title={w.title}>
                  {w.title}
                </td>
                <td className="max-w-[150px] px-4 py-3 text-muted hidden md:table-cell" title={w.sectorName}>
                  {w.sectorName}
                </td>
                <td className="px-4 py-3 text-muted hidden lg:table-cell">
                  {w.sourceType === "event" ? "Événement" : w.sourceType === "news" ? "Actualité" : "Réglementation"}
                </td>
                <td className="px-4 py-3 text-muted hidden sm:table-cell">
                  <span className="inline-block rounded bg-surface-hover px-2 py-1 text-xs">
                    {w.practiceLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted hidden xl:table-cell">
                  {w.deadlineAt ? new Date(w.deadlineAt).toLocaleDateString("fr-FR") : "-"}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold ${
                    w.urgencyScore >= 80 ? "bg-danger/10 text-danger" :
                    w.urgencyScore >= 60 ? "bg-orange-500/10 text-orange-500" :
                    "bg-surface-hover text-heading"
                  }`}>
                    {w.urgencyScore}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-medium text-heading">
                  {w.exposedAccountCount}
                </td>
                <td className="max-w-[250px] px-4 py-3 text-xs text-muted hidden 2xl:table-cell" title={w.suggestedAction}>
                  {w.suggestedAction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onShowAll && windows.length > visibleWindows.length ? (
        <div className="flex justify-end border-t border-border px-5 py-3">
          <button type="button" onClick={onShowAll} className="min-h-10 text-xs font-bold text-primary transition-colors hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Voir toutes les fenêtres ({windows.length}) <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </section>
  )
}
