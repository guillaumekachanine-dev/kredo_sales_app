import React from 'react'
import type { SectorCompany } from '@/types/sector'

export interface AccountsListProps {
  companies: SectorCompany[]
  hasError?: boolean
}

const LIFECYCLE_BADGE_COLORS: Record<string, string> = {
  client_actif: 'bg-success/10 text-success border border-success/15',
  prospect: 'bg-muted/10 text-heading border border-border',
  cible: 'bg-muted/5 text-muted border border-border/40',
}

const LIFECYCLE_LABELS: Record<string, string> = {
  client_actif: 'Client Actif',
  prospect: 'Prospect',
  cible: 'Cible',
  client_dormant: 'Client Dormant',
  ancien_client: 'Ancien Client',
  partenaire: 'Partenaire',
}

/**
 * AccountsList - Renders the list of companies associated with the sector.
 * Ordered with client_actif first, showing AI Score and right-aligned revenue.
 */
export function AccountsList({ companies, hasError }: AccountsListProps) {
  if (hasError) {
    return (
      <div className="text-xs text-danger bg-danger/5 border border-danger/10 p-3 rounded font-medium">
        Une erreur est survenue lors du chargement des comptes rattachés.
      </div>
    )
  }

  if (!companies || companies.length === 0) {
    return <p className="text-xs text-muted">Aucun compte rattaché à ce secteur.</p>
  }

  // Sort: client_actif first, then sub-sorted by AI score DESC
  const sorted = [...companies].sort((a, b) => {
    const isActifA = a.lifecycle_status === 'client_actif'
    const isActifB = b.lifecycle_status === 'client_actif'
    if (isActifA && !isActifB) return -1
    if (!isActifA && isActifB) return 1

    const scoreA = a.ai_score ?? -1
    const scoreB = b.ai_score ?? -1
    return scoreB - scoreA
  })

  return (
    <div className="bg-surface border border-border divide-y divide-border/60 rounded overflow-hidden">
      {sorted.map((company) => {
        const badgeClass = LIFECYCLE_BADGE_COLORS[company.lifecycle_status] ?? 'bg-muted/10 text-muted'
        const label = LIFECYCLE_LABELS[company.lifecycle_status] ?? company.lifecycle_status

        return (
          <div key={company.id} className="p-3 flex items-center justify-between gap-4 hover:bg-surface-hover/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-heading leading-tight">
                  {company.name}
                </span>
                {company.ai_score !== null && (
                  <span className="text-[10px] text-muted font-medium">
                    Score IA : <span className="font-semibold text-primary">{company.ai_score.toFixed(1)}/5.0</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
                {label}
              </span>
              {company.revenue && (
                <span className="text-xs font-semibold text-heading text-right min-w-[70px]">
                  {company.revenue}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
