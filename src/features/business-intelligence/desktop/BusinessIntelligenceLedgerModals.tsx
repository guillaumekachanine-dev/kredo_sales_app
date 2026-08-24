import { AppDialog } from "@/components/ui/AppDialog"
import { Button } from "@/components/ui/Button"
import type { SectorActivationWindow } from "@/lib/prospection/sector-activation-types"
import type { AccountPriorityItem } from "../models/build-account-prioritization-model"
import { SectorWindowsTimeline } from "./SectorWindowsTimeline"

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
      title="Comptes à examiner"
      description="Comptes ordonnés par signal urgent, opportunité sans action, inactivité, puis nom."
      dataTheme="intelligence-reports"
      className="!w-[min(calc(100vw-2rem),72rem)]"
      bodyClassName="!pr-0"
      titleClassName="!text-body"
      footer={<Button variant="secondary" className="!border-border/40 !bg-surface/30 !text-body hover:!border-primary hover:!bg-primary/5 hover:!text-primary" onClick={onClose}>Fermer</Button>}
    >
      <div className="overflow-x-auto border-y border-border/60">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-surface-hover/50 text-[10px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-3 py-3">Ordre</th><th className="px-3 py-3">Compte</th><th className="px-3 py-3">Signal</th><th className="px-3 py-3">Opportunités</th><th className="px-3 py-3">Reach / Momentum</th><th className="px-3 py-3">Prochaine action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {accounts.map((account, index) => {
              const selected = account.accountId === selectedAccountId
              return <tr key={account.accountId} tabIndex={0} onClick={() => onSelectAccount(account.accountId)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectAccount(account.accountId) } }} className={`cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${selected ? "border-l-2 border-primary bg-primary/10" : "hover:bg-surface-hover/45"}`}>
                <td className="px-3 py-3 font-mono text-muted">{index + 1}</td><td className="px-3 py-3 font-semibold text-body">{account.name}</td><td className="px-3 py-3 text-body">{account.topSignal?.title ?? "Aucun signal actif"}</td><td className="px-3 py-3 text-body">{account.openOpportunityCount}</td><td className="px-3 py-3 text-body">R: {account.reach} · M: {account.momentum}</td><td className="max-w-[260px] px-3 py-3 text-body">{account.nextAction ?? "Action non déterminée"}</td>
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
  selectedWindowId,
  isMobile = false,
}: {
  open: boolean
  onClose: () => void
  windows: SectorActivationWindow[]
  onSelectWindow: (window: SectorActivationWindow) => void
  selectedWindowId?: string | null
  isMobile?: boolean
}) {
  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Fenêtres sectorielles"
      description="Toutes les fenêtres détectées, regroupées chronologiquement."
      dataTheme="intelligence-reports"
      className="!w-[min(calc(100vw-2rem),72rem)]"
      bodyClassName="!pr-0"
      titleClassName="!text-body"
      footer={<Button variant="secondary" className="!border-border/40 !bg-surface/30 !text-body hover:!border-primary hover:!bg-primary/5 hover:!text-primary" onClick={onClose}>Fermer</Button>}
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
      ) : <SectorWindowsTimeline windows={windows} onSelectWindow={onSelectWindow} selectedWindowId={selectedWindowId} mode="expanded" />}
    </AppDialog>
  )
}
