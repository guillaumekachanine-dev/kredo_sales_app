import { AccountPriorityItem } from "../models/build-account-prioritization-model"

interface AccountPriorityBoardProps {
  accounts: AccountPriorityItem[]
  selectedAccountId: string | null
  onSelectAccount: (id: string) => void
}

export function AccountPriorityBoard({ accounts, selectedAccountId, onSelectAccount }: AccountPriorityBoardProps) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <h3 className="font-bold text-[var(--color-text-main)]">Classement de couverture</h3>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-[var(--color-surface-hover)] text-[var(--color-muted)] sticky top-0 z-10 text-xs uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)]">Rang</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)]">Compte</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)]">Score Action</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)]">Score Natif</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)] hidden lg:table-cell">Potentiel / Reach</th>
              <th className="py-3 px-4 font-semibold border-b border-[var(--color-border)] hidden xl:table-cell">Prochaine action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--color-muted)]">
                  Aucun compte prioritaire trouvé.
                </td>
              </tr>
            )}
            {accounts.map((account, index) => {
              const isSelected = selectedAccountId === account.accountId
              
              let provenanceLabel = ""
              if (account.provenance === "REAL_NATIVE") provenanceLabel = "Natif"
              else if (account.provenance === "REAL_LEGACY") provenanceLabel = "Historique"
              else provenanceLabel = "Proxy"

              return (
                <tr 
                  key={account.accountId} 
                  onClick={() => onSelectAccount(account.accountId)}
                  className={`cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)] ${isSelected ? "bg-[var(--color-surface-hover)]" : ""}`}
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
                  <td className="py-3 px-4 text-[var(--color-muted)] font-mono">{index + 1}</td>
                  <td className="py-3 px-4 font-medium text-[var(--color-text-main)] truncate max-w-[200px]" title={account.name}>
                    {account.name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-[var(--color-surface-hover)] text-xs font-bold text-[var(--color-text-main)]">
                      {account.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {account.nativeScore ? (
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--color-text-main)]">{account.nativeScore.value}</span>
                        <span className="text-[10px] text-[var(--color-muted)]">{provenanceLabel} • {account.nativeScore.confidence}% conf.</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">{provenanceLabel}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-[var(--color-text-main)]" title="Potentiel">P: {account.potential}</span>
                      <span className="text-[var(--color-muted)]">|</span>
                      <span className={account.reach < 50 ? "text-[var(--color-error)]" : "text-[var(--color-text-main)]"} title="Reach">
                        R: {account.reach}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden xl:table-cell text-xs text-[var(--color-text-main)] truncate max-w-[250px]" title={account.nextAction ?? "Action non déterminée"}>
                    {account.nextAction ?? <span className="text-[var(--color-muted)] italic">Action non déterminée</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
