import { AccountPriorityItem } from "../models/build-account-prioritization-model"

interface AccountPriorityBoardProps {
  accounts: AccountPriorityItem[]
  selectedAccountId: string | null
  onSelectAccount: (id: string) => void
  limit?: number
  onShowAll?: () => void
}

export function AccountPriorityBoard({ accounts, selectedAccountId, onSelectAccount, limit, onShowAll }: AccountPriorityBoardProps) {
  const visibleAccounts = limit ? accounts.slice(0, limit) : accounts

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="font-heading text-base font-bold text-heading">Classement de couverture</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-surface-hover/50 text-muted text-[10px] uppercase tracking-[0.1em]">
            <tr>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)]">Rang</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)]">Compte</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)]">Score Action</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)]">Score Natif</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)] hidden lg:table-cell">Potentiel / Reach</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)] hidden xl:table-cell">Prochaine action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--color-muted)]">
                  Aucun compte prioritaire trouvé.
                </td>
              </tr>
            )}
            {visibleAccounts.map((account, index) => {
              const isSelected = selectedAccountId === account.accountId
              
              let provenanceLabel = ""
              if (account.provenance === "REAL_NATIVE") provenanceLabel = "Natif"
              else if (account.provenance === "REAL_LEGACY") provenanceLabel = "Historique"
              else provenanceLabel = "Proxy"

              return (
                <tr 
                  key={account.accountId} 
                  onClick={() => onSelectAccount(account.accountId)}
                  className={`cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSelected ? "border-l-2 border-primary bg-primary/10" : "hover:bg-surface-hover/45"}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectAccount(account.accountId)
                    }
                  }}
                  role="row"
                  aria-selected={isSelected}
                >
                  <td className="py-3 px-4 font-mono text-muted">{index + 1}</td>
                  <td className="max-w-[200px] px-4 py-3 font-medium text-heading" title={account.name}>
                    {account.name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center rounded bg-surface-hover px-2 py-1 text-xs font-bold text-heading">
                      {account.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {account.nativeScore ? (
                      <div className="flex flex-col">
                        <span className="font-semibold text-heading">{account.nativeScore.value}</span>
                        <span className="text-[10px] text-muted">{provenanceLabel} • {account.nativeScore.confidence}% conf.</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">{provenanceLabel}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-heading" title="Potentiel">P: {account.potential}</span>
                      <span className="text-muted">|</span>
                      <span className={account.reach < 50 ? "text-danger" : "text-heading"} title="Reach">
                        R: {account.reach}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-[250px] px-4 py-3 text-xs text-heading hidden xl:table-cell" title={account.nextAction ?? "Action non déterminée"}>
                    {account.nextAction ?? <span className="italic text-muted">Action non déterminée</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {onShowAll && accounts.length > visibleAccounts.length ? (
        <div className="flex justify-end border-t border-border px-5 py-3">
          <button type="button" onClick={onShowAll} className="min-h-10 text-xs font-bold text-primary transition-colors hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Voir tous les comptes ({accounts.length}) <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </section>
  )
}
