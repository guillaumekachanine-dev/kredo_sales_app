"use client"

import type { BusinessIntelligenceMobileAccount } from "../presenters/build-business-intelligence-mobile-model"
import { EmptyPanel } from "./MobileDecisionBrief"

export function MobilePriorityAccounts({
  accounts,
  selectedAccountId,
  onSelectAccount,
}: {
  accounts: BusinessIntelligenceMobileAccount[]
  selectedAccountId: string | null
  onSelectAccount: (accountId: string) => void
}) {
  if (accounts.length === 0) return <EmptyPanel title="Aucun compte après filtre" description="Aucun compte prioritaire n'est disponible pour cette période." />

  return (
    <section className="px-4 py-5" aria-labelledby="mobile-priority-accounts-title">
      <div className="mb-3 flex items-end justify-between"><h2 id="mobile-priority-accounts-title" className="text-sm font-bold text-white">Top comptes</h2><span className="text-xs text-white/45">{accounts.length} maximum</span></div>
      <div className="space-y-2">
        {accounts.map((account) => {
          const selected = account.accountId === selectedAccountId
          return (
            <button key={account.accountId} type="button" onClick={() => onSelectAccount(account.accountId)} aria-pressed={selected} className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-brass motion-reduce:transition-none ${selected ? "border-brand-brass/50 bg-brand-brass/[0.08]" : "border-white/10 bg-white/[0.025] hover:bg-white/[0.05]"}`}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{account.name}</p><p className="mt-1 text-[11px] text-white/50">{account.sectorName ?? "Secteur non renseigné"} · priorité {account.priority}</p></div><Provenance account={account} /></div>
              <div className="mt-3 grid grid-cols-3 gap-2"><ScoreBar label="Potentiel" value={account.potential} /><ScoreBar label="Reach" value={account.reach} /><ScoreBar label="Momentum" value={account.momentum} /></div>
              <p className="mt-3 line-clamp-1 text-xs text-white/70">{account.topSignal?.title ?? "Signal indisponible"}</p>
              <p className={`mt-1 line-clamp-1 text-[11px] ${account.nextAction ? "text-brand-brass" : "text-white/40 italic"}`}>{account.nextAction ?? "Action non déterminée"}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Provenance({ account }: { account: BusinessIntelligenceMobileAccount }) {
  if (account.nativeScore) return <span className="shrink-0 text-[10px] font-semibold text-brand-brass">Natif {account.nativeScore.value}</span>
  if (account.provenance === "REAL_LEGACY") return <span className="shrink-0 text-[10px] font-semibold text-white/55">Historique</span>
  return <span className="shrink-0 text-[10px] font-semibold text-white/45">Proxy</span>
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return <div><div className="flex justify-between gap-1 text-[10px] text-white/45"><span>{label}</span><span>{value}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-brass" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div></div>
}
