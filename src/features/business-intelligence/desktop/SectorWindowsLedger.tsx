"use client"

import { SectorActivationWindow } from "@/lib/prospection/sector-activation-types"

interface SectorWindowsLedgerProps {
  windows: SectorActivationWindow[]
  onSelectWindow: (window: SectorActivationWindow) => void
}

export function SectorWindowsLedger({ windows, onSelectWindow }: SectorWindowsLedgerProps) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]">
        <h3 className="font-bold text-[var(--color-text-main)]">Fenêtres sectorielles</h3>
        <button className="text-xs font-medium text-[var(--color-dataviz-1)] hover:underline">
          Voir toutes les fenêtres
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-[var(--color-surface-hover)] text-[var(--color-muted)] sticky top-0 z-10 text-xs uppercase tracking-wider">
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
          <tbody className="divide-y divide-[var(--color-border)]">
            {windows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--color-muted)]">
                  Aucune fenêtre active détectée.
                </td>
              </tr>
            )}
            {windows.map((w) => (
              <tr 
                key={w.id} 
                className="cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)]"
                onClick={() => onSelectWindow(w)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectWindow(w)
                  }
                }}
              >
                <td className="py-3 px-4 text-[var(--color-text-main)] font-medium max-w-[200px] truncate" title={w.title}>
                  {w.title}
                </td>
                <td className="py-3 px-4 text-[var(--color-muted)] hidden md:table-cell truncate max-w-[150px]" title={w.sectorName}>
                  {w.sectorName}
                </td>
                <td className="py-3 px-4 text-[var(--color-muted)] hidden lg:table-cell">
                  {w.sourceType === "event" ? "Événement" : w.sourceType === "news" ? "Actualité" : "Réglementation"}
                </td>
                <td className="py-3 px-4 text-[var(--color-muted)] hidden sm:table-cell">
                  <span className="inline-block px-2 py-1 bg-[var(--color-surface-hover)] rounded text-xs">
                    {w.practiceLabel}
                  </span>
                </td>
                <td className="py-3 px-4 text-[var(--color-muted)] hidden xl:table-cell">
                  {w.deadlineAt ? new Date(w.deadlineAt).toLocaleDateString("fr-FR") : "-"}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold ${
                    w.urgencyScore >= 80 ? "bg-[var(--color-error)]/10 text-[var(--color-error)]" :
                    w.urgencyScore >= 60 ? "bg-orange-500/10 text-orange-500" :
                    "bg-[var(--color-surface-hover)] text-[var(--color-text-main)]"
                  }`}>
                    {w.urgencyScore}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-[var(--color-text-main)] font-medium">
                  {w.exposedAccountCount}
                </td>
                <td className="py-3 px-4 text-[var(--color-muted)] text-xs hidden 2xl:table-cell max-w-[250px] truncate" title={w.suggestedAction}>
                  {w.suggestedAction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
