import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import type { SectorActivationWindow } from "@/lib/prospection/sector-activation-types"
import type { AccountPriorityItem } from "../models/build-account-prioritization-model"

export function PriorityAccountsModal({
  open,
  onClose,
  accounts,
  selectedAccountId,
  onSelectAccount,
}: {
  open: boolean
  onClose: () => void
  accounts: AccountPriorityItem[]
  selectedAccountId: string | null
  onSelectAccount: (accountId: string) => void
}) {
  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Classement de couverture"
      description="Tous les comptes prioritaires de la sélection active."
      dataTheme="intelligence-reports"
      className="!w-[min(calc(100vw-2rem),72rem)]"
      bodyClassName="!pr-0"
      footer={<Button variant="secondary" onClick={onClose}>Fermer</Button>}
    >
      <div className="overflow-x-auto border-y border-border/60">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-surface-hover/50 text-[10px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-3 py-3">Rang</th><th className="px-3 py-3">Compte</th><th className="px-3 py-3">Score action</th><th className="px-3 py-3">Score natif</th><th className="px-3 py-3">Potentiel / Reach</th><th className="px-3 py-3">Prochaine action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {accounts.map((account, index) => {
              const selected = account.accountId === selectedAccountId
              return <tr key={account.accountId} tabIndex={0} onClick={() => onSelectAccount(account.accountId)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectAccount(account.accountId) } }} className={`cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${selected ? "border-l-2 border-primary bg-primary/10" : "hover:bg-surface-hover/45"}`}>
                <td className="px-3 py-3 font-mono text-muted">{index + 1}</td><td className="px-3 py-3 font-semibold text-heading">{account.name}</td><td className="px-3 py-3 text-heading">{account.priority}</td><td className="px-3 py-3 text-body">{account.nativeScore ? `${account.nativeScore.value} · ${account.nativeScore.confidence}%` : "Proxy"}</td><td className="px-3 py-3 text-body">P: {account.potential} · R: {account.reach}</td><td className="max-w-[260px] px-3 py-3 text-body">{account.nextAction ?? "Action non déterminée"}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </AppDialog>
  )
}

export function SectorWindowsModal({
  open,
  onClose,
  windows,
  onSelectWindow,
  isMobile = false,
}: {
  open: boolean
  onClose: () => void
  windows: SectorActivationWindow[]
  onSelectWindow: (window: SectorActivationWindow) => void
  isMobile?: boolean
}) {
  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Fenêtres sectorielles"
      description="Toutes les fenêtres détectées, triées par priorité."
      dataTheme="intelligence-reports"
      className="!w-[min(calc(100vw-2rem),72rem)]"
      bodyClassName="!pr-0"
      footer={<Button variant="secondary" onClick={onClose}>Fermer</Button>}
    >
      {isMobile ? (
        <div className="space-y-3">
          {windows.map((window) => (
            <button key={window.id} type="button" onClick={() => onSelectWindow(window)} className="w-full rounded-xl border border-border bg-surface p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-heading">{window.title}</p><p className="mt-1 text-xs text-body">{window.sectorName} · {window.practiceLabel}</p></div><span className={window.urgencyScore >= 80 ? "rounded-md bg-danger/10 px-2 py-1 text-xs font-bold text-danger" : "rounded-md bg-surface-hover px-2 py-1 text-xs font-bold text-heading"}>{window.urgencyScore}</span></div>
              <p className="mt-3 text-xs leading-relaxed text-body">{window.suggestedAction}</p>
              <p className="mt-3 text-xs font-semibold text-primary">Voir le compte exposé prioritaire</p>
            </button>
          ))}
        </div>
      ) : <div className="overflow-x-auto border-y border-border/60">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-surface-hover/50 text-[10px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-3 py-3">Fenêtre</th><th className="px-3 py-3">Secteur</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Practice</th><th className="px-3 py-3">Échéance</th><th className="px-3 py-3">Urgence</th><th className="px-3 py-3">Comptes</th><th className="px-3 py-3">Action suggérée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {windows.map((window) => <tr key={window.id} tabIndex={0} onClick={() => onSelectWindow(window)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectWindow(window) } }} className="cursor-pointer transition-colors hover:bg-surface-hover/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
              <td className="max-w-[220px] px-3 py-3 font-semibold text-heading">{window.title}</td><td className="max-w-[160px] px-3 py-3 text-body">{window.sectorName}</td><td className="px-3 py-3 text-body">{window.sourceType === "event" ? "Événement" : window.sourceType === "news" ? "Actualité" : "Réglementation"}</td><td className="px-3 py-3 text-body">{window.practiceLabel}</td><td className="px-3 py-3 text-body">{window.deadlineAt ? new Date(window.deadlineAt).toLocaleDateString("fr-FR") : "—"}</td><td className={window.urgencyScore >= 80 ? "px-3 py-3 font-bold text-danger" : "px-3 py-3 text-heading"}>{window.urgencyScore}</td><td className="px-3 py-3 text-center text-heading">{window.exposedAccountCount}</td><td className="max-w-[260px] px-3 py-3 text-body">{window.suggestedAction}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </AppDialog>
  )
}
