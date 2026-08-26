"use client"

import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import type { CrmLauncherAccount, CrmLauncherMode } from "./CrmAccountLauncher"

interface CrmLauncherAccountCardProps {
  account: CrmLauncherAccount
  mode: CrmLauncherMode
  onSelect: () => void
}

// Libellés de `companies.relation_type` (migration 066 §5.8).
const RELATION_TYPE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  client: "Client",
  ancien_client: "Ancien client",
  pair_partenaire: "Partenaire",
}

function relationTypeLabel(value: string | null): string {
  if (!value) return "Relation non renseignée"
  return RELATION_TYPE_LABELS[value] ?? value
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRelativeActivity(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) return `il y a ${Math.max(1, diffMins)} min`
  if (diffHours < 24) return `il y a ${diffHours} h`
  if (diffDays < 7) return `il y a ${diffDays} j`
  return `il y a ${Math.floor(diffDays / 7)} sem.`
}

export function CrmLauncherAccountCard({
  account,
  mode,
  onSelect,
}: CrmLauncherAccountCardProps) {

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 rounded-[var(--radius-medium)] border border-transparent bg-surface hover:bg-surface-hover hover:scale-[1.02] active:scale-[0.98] p-2.5 cursor-pointer transition-all duration-200 hover:border-primary/10 hover:shadow-sm"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <CompanyLogo
        name={account.name}
        logoPath={account.logoPath}
        website={account.website}
        size="md"
        denseList
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-heading truncate">
            {account.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted truncate mt-0.5">
          <span>{relationTypeLabel(account.status)}</span>
        </div>
      </div>

      {/* Colonne droite dépendante du mode */}
      <div className="flex flex-col items-end shrink-0">
        {mode === "recent" && account.lastActivityAt && (
          <span className="text-[10px] font-bold text-primary">
            {formatRelativeActivity(account.lastActivityAt)}
          </span>
        )}

        {mode === "clients" && account.realizedRevenue !== undefined && (
          <span className="text-[10px] font-bold text-success">
            {formatEuro(account.realizedRevenue)}
          </span>
        )}

      </div>
    </div>
  )
}
