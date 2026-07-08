"use client"

import { CompanyLogo } from "@/components/accounts-contacts/CompanyLogo"
import type { CrmLauncherAccount, CrmLauncherMode } from "./CrmAccountLauncher"

interface CrmLauncherAccountCardProps {
  account: CrmLauncherAccount
  mode: CrmLauncherMode
  onSelect: () => void
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function CrmLauncherAccountCard({
  account,
  mode,
  onSelect,
}: CrmLauncherAccountCardProps) {

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 rounded-[var(--radius-medium)] border border-border/40 bg-surface hover:bg-canvas p-2.5 cursor-pointer transition-all hover:border-primary/20 hover:shadow-sm"
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
        size="sm"
        denseList
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs text-heading truncate">
            {account.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted truncate mt-0.5">
          <span>{account.sector || "Secteur non renseigné"}</span>
          <span>·</span>
          <span>{account.status || "Statut non renseigné"}</span>
        </div>
      </div>

      {/* Colonne droite dépendante du mode ou du score */}
      <div className="flex flex-col items-end shrink-0">
        {mode === "news" && account.signalCountWeek !== undefined && (
          <span className="text-[10px] font-bold text-primary">
            {account.signalCountWeek} {account.signalCountWeek > 1 ? "signaux" : "signal"}
          </span>
        )}

        {mode === "opportunities" && account.openOpportunitiesCount !== undefined && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-success">
              {formatEuro(account.weightedPipeline || 0)}
            </span>
            <span className="text-[9px] text-muted">
              {account.openOpportunitiesCount} opp{account.openOpportunitiesCount > 1 ? "s" : ""} active{account.openOpportunitiesCount > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {mode !== "news" && mode !== "opportunities" && account.score !== null && (
          <div className="flex items-center gap-1 bg-surface-secondary/40 px-1.5 py-0.5 rounded border border-border/30">
            <svg
              className="w-3 h-3 text-warning fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            <span className="text-[10px] font-bold text-heading">
              {account.score}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
