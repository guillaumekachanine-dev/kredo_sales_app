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
    <section className="overflow-hidden rounded-xl border border-border/30 bg-surface/30">
      <div className="flex items-center justify-between border-b border-border/30 px-5 py-4">
        <h2 className="font-heading text-sm font-bold text-heading">Classement de couverture</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-surface-hover/20 text-muted text-[10px] uppercase tracking-[0.1em]">
            <tr>
              <th className="border-b border-border/30 px-4 py-3 font-semibold">Rang</th>
              <th className="border-b border-border/30 px-4 py-3 font-semibold">Compte</th>
              <th className="border-b border-border/30 px-4 py-3 font-semibold">Signal</th>
              <th className="border-b border-border/30 px-4 py-3 font-semibold">Reach</th>
              <th className="hidden border-b border-border/30 px-4 py-3 font-semibold xl:table-cell">Prochaine action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  Aucun compte prioritaire trouvé.
                </td>
              </tr>
            )}
            {visibleAccounts.map((account, index) => {
              const isSelected = selectedAccountId === account.accountId
              
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
                  <td className="max-w-[200px] px-4 py-3 font-medium text-body" title={account.name}>
                    {account.name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center rounded bg-surface-hover px-2 py-1 text-xs font-bold text-body">
                      {account.topSignal?.title ?? "Aucun signal actif"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-body">{account.reach}</span>
                  </td>
                  <td className="hidden max-w-[250px] px-4 py-3 text-xs text-body xl:table-cell" title={account.nextAction ?? "Action non déterminée"}>
                    {account.nextAction ?? <span className="italic text-muted">Action non déterminée</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {onShowAll && accounts.length > visibleAccounts.length ? (
        <div className="flex justify-end border-t border-border/30 px-5 py-3">
          <button type="button" onClick={onShowAll} className="min-h-9 rounded-lg border border-border/40 bg-surface/30 px-3 text-xs font-semibold text-body transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Voir tous les comptes ({accounts.length}) <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}
    </section>
  )
}
