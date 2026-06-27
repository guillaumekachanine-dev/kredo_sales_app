"use client"

import { useState } from "react"
import Link from "next/link"
import { SurfaceCard } from "@/components/ui/SurfaceCard"
import {
  getPortfolioPeriodMetrics,
  type ProspectionPeriod,
  type ProspectionPortfolioAccount,
} from "@/lib/prospection/portfolio-account-metrics"
import { getCommercialRecommendation } from "./synthese-view-model"

type SortKey =
  | "name"
  | "sector"
  | "potential"
  | "reach"
  | "momentum"
  | "gap"
  | "lastActivity"
  | "planned"

type SortDirection = "asc" | "desc"

export function AccountsToActivateTable({
  accounts,
  period,
  selectedAccountId,
  onSelectAccount,
}: {
  accounts: ProspectionPortfolioAccount[]
  period: ProspectionPeriod
  selectedAccountId: string | null
  onSelectAccount: (accountId: string) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>("potential")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const sortedAccounts = [...accounts].sort((left, right) => {
    const compare = compareAccounts(left, right, period, sortKey)
    return sortDirection === "asc" ? compare : compare * -1
  })

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold text-heading">Portefeuille à activer</h2>
        <p className="text-sm leading-6 text-body">
          Lecture dense et triable des comptes à activer dans le portefeuille filtré.
        </p>
      </div>

      <SurfaceCard className="overflow-hidden">
        {sortedAccounts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            Aucun compte ne correspond à ce jeu de filtres.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                  <SortableHeader label="Compte" active={sortKey === "name"} direction={sortDirection} onClick={() => toggleSort("name", sortKey, sortDirection, setSortKey, setSortDirection)} />
                  <SortableHeader label="Secteur" active={sortKey === "sector"} direction={sortDirection} onClick={() => toggleSort("sector", sortKey, sortDirection, setSortKey, setSortDirection)} />
                  <SortableHeader label="Potentiel" active={sortKey === "potential"} direction={sortDirection} onClick={() => toggleSort("potential", sortKey, sortDirection, setSortKey, setSortDirection)} />
                  <SortableHeader label="Reach" active={sortKey === "reach"} direction={sortDirection} onClick={() => toggleSort("reach", sortKey, sortDirection, setSortKey, setSortDirection)} />
                  <SortableHeader label="Momentum" active={sortKey === "momentum"} direction={sortDirection} onClick={() => toggleSort("momentum", sortKey, sortDirection, setSortKey, setSortDirection)} />
                  <SortableHeader label="Gap" active={sortKey === "gap"} direction={sortDirection} onClick={() => toggleSort("gap", sortKey, sortDirection, setSortKey, setSortDirection)} />
                  <SortableHeader label="Dernière activité" active={sortKey === "lastActivity"} direction={sortDirection} onClick={() => toggleSort("lastActivity", sortKey, sortDirection, setSortKey, setSortDirection)} />
                  <SortableHeader label="Planifié" active={sortKey === "planned"} direction={sortDirection} onClick={() => toggleSort("planned", sortKey, sortDirection, setSortKey, setSortDirection)} />
                  <th className="px-4 py-3">Action recommandée</th>
                  <th className="px-4 py-3">Hub</th>
                </tr>
              </thead>
              <tbody>
                {sortedAccounts.map((account) => {
                  const periodMetrics = getPortfolioPeriodMetrics(account, period)
                  const isSelected = account.id === selectedAccountId

                  return (
                    <tr
                      key={account.id}
                      className={isSelected ? "bg-primary/[0.05]" : "hover:bg-surface-hover"}
                    >
                      <td className="border-b border-border px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onSelectAccount(account.id)}
                          className="text-left focus-visible:outline-none"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-heading">{account.name}</p>
                          </div>
                        </button>
                      </td>
                      <td className="border-b border-border px-4 py-3">{account.sector}</td>
                      <td className="border-b border-border px-4 py-3 font-semibold text-heading">{account.potentialScore}</td>
                      <td className="border-b border-border px-4 py-3">{account.reachScore}</td>
                      <td className="border-b border-border px-4 py-3">{periodMetrics.momentumScore}</td>
                      <td className="border-b border-border px-4 py-3">{account.reachGapScore}</td>
                      <td className="border-b border-border px-4 py-3">{formatDateLabel(account.latestCommercialActivityAt)}</td>
                      <td className="border-b border-border px-4 py-3">{periodMetrics.plannedCount > 0 ? `${periodMetrics.plannedCount}` : "—"}</td>
                      <td className="border-b border-border px-4 py-3 text-body">
                        {getCommercialRecommendation(account, period).actionLabel}
                      </td>
                      <td className="border-b border-border px-4 py-3">
                        <Link href={`/prospection/accounts/${account.id}`} className="text-sm font-semibold text-primary hover:underline">
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>
    </section>
  )
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: SortDirection
  onClick: () => void
}) {
  return (
    <th className="px-4 py-3">
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold">
        {label}
        {active ? <span>{direction === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </th>
  )
}

function toggleSort(
  nextKey: SortKey,
  currentKey: SortKey,
  currentDirection: SortDirection,
  setSortKey: (value: SortKey) => void,
  setSortDirection: (value: SortDirection) => void,
) {
  if (currentKey === nextKey) {
    setSortDirection(currentDirection === "asc" ? "desc" : "asc")
    return
  }

  setSortKey(nextKey)
  setSortDirection(nextKey === "name" || nextKey === "sector" || nextKey === "lastActivity" ? "asc" : "desc")
}

function compareAccounts(
  left: ProspectionPortfolioAccount,
  right: ProspectionPortfolioAccount,
  period: ProspectionPeriod,
  sortKey: SortKey,
) {
  if (sortKey === "name") return left.name.localeCompare(right.name)
  if (sortKey === "sector") return left.sector.localeCompare(right.sector)
  if (sortKey === "potential") return left.potentialScore - right.potentialScore
  if (sortKey === "reach") return left.reachScore - right.reachScore
  if (sortKey === "gap") return left.reachGapScore - right.reachGapScore
  if (sortKey === "momentum") return getPortfolioPeriodMetrics(left, period).momentumScore - getPortfolioPeriodMetrics(right, period).momentumScore
  if (sortKey === "planned") return getPortfolioPeriodMetrics(left, period).plannedCount - getPortfolioPeriodMetrics(right, period).plannedCount

  const leftDate = left.latestCommercialActivityAt ? new Date(left.latestCommercialActivityAt).getTime() : 0
  const rightDate = right.latestCommercialActivityAt ? new Date(right.latestCommercialActivityAt).getTime() : 0
  return leftDate - rightDate
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Aucune"
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value))
}
