"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDateTime, formatEuroCompact } from "@/lib/formatters"
import { Button } from "@/components/ui/Button"
import type { DashboardLabAccount } from "@/lib/prospection/dashboard-lab-data"
import type { DashboardLabInspection, DashboardLabViewModel } from "./dashboard-lab-types"
import {
  AccountIdentityLine,
  BlockFrame,
  LabEmptyState,
  MetricStrip,
  ProvenanceBadge,
} from "./DashboardLabShared"

type MatrixScope = "priority" | "all"

function getMomentumScore(account: DashboardLabAccount, period: DashboardLabViewModel["filters"]["period"]) {
  if (period === "180d") return account.momentumScore180d
  if (period === "90d") return account.momentumScore90d
  return account.momentumScore30d
}

function getPriorityScore(account: DashboardLabAccount, period: DashboardLabViewModel["filters"]["period"]) {
  if (period === "180d") return account.actionPriorityScore180d
  if (period === "90d") return account.actionPriorityScore90d
  return account.actionPriorityScore30d
}

function getPlannedEngagementCount(account: DashboardLabAccount, period: DashboardLabViewModel["filters"]["period"]) {
  if (period === "180d") return account.plannedCommercialEngagement180d
  if (period === "90d") return account.plannedCommercialEngagement90d
  return account.plannedCommercialEngagement30d
}

function pointSize(contactCount: number) {
  return Math.min(26, 11 + contactCount)
}

function clampToCanvas(value: number) {
  return Math.min(92, Math.max(8, value))
}

function buildMatrixPoints(accounts: DashboardLabAccount[], period: DashboardLabViewModel["filters"]["period"]) {
  const buckets = new Map<string, Array<{ account: DashboardLabAccount; x: number; y: number; momentum: number; size: number }>>()

  for (const account of accounts) {
    const x = clampToCanvas(account.reachScore)
    const y = clampToCanvas(100 - account.potentialScore)
    const key = `${Math.round(x / 6)}-${Math.round(y / 6)}`
    const entry = {
      account,
      x,
      y,
      momentum: getMomentumScore(account, period),
      size: pointSize(account.contactCount),
    }
    const current = buckets.get(key) ?? []
    current.push(entry)
    buckets.set(key, current)
  }

  return Array.from(buckets.values()).flatMap((bucket) => {
    const sortedBucket = bucket.toSorted((left, right) => left.account.id.localeCompare(right.account.id))
    return sortedBucket.map((entry, index) => {
      if (sortedBucket.length === 1) {
        return { ...entry, offsetX: 0, offsetY: 0 }
      }

      const angle = (2 * Math.PI * index) / sortedBucket.length
      const ring = Math.floor(index / 6)
      const radius = 8 + ring * 6

      return {
        ...entry,
        offsetX: Math.cos(angle) * radius,
        offsetY: Math.sin(angle) * radius,
      }
    })
  })
}

export function AccountIntelligenceLab({
  viewModel,
  onSelectAccount,
  onInspect,
}: {
  viewModel: DashboardLabViewModel
  onSelectAccount: (accountId: string) => void
  onInspect: (inspection: DashboardLabInspection) => void
}) {
  const [scope, setScope] = useState<MatrixScope>("priority")

  if (viewModel.accounts.length === 0) {
    return (
      <LabEmptyState
        title="Aucun compte pour cette matrice"
        body="Le concept Account Intelligence a besoin d'un portefeuille filtré pour positionner les comptes entre potentiel et reach."
      />
    )
  }

  const selectedAccount = viewModel.selectedAccount ?? viewModel.accounts[0] ?? null
  const prioritizedAccounts = [...viewModel.accounts]
    .sort((left, right) => getPriorityScore(right, viewModel.filters.period) - getPriorityScore(left, viewModel.filters.period))
    .slice(0, 28)

  const matrixAccounts = scope === "all"
    ? viewModel.accounts
    : selectedAccount && !prioritizedAccounts.some((account) => account.id === selectedAccount.id)
      ? [...prioritizedAccounts, selectedAccount]
      : prioritizedAccounts

  const plottedAccounts = buildMatrixPoints(matrixAccounts, viewModel.filters.period)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.85fr)]">
      <div className="space-y-6">
        <BlockFrame
          title="Fit × Reach Matrix with Momentum Halo"
          subtitle="Axe vertical : potentiel compte. Axe horizontal : reach commercial proxy. Taille : densité de contacts. Halo : momentum mensuel équivalent."
          meta={viewModel.trust.accountReach}
          actions={(
            <div className="flex items-center gap-1 rounded-[var(--radius-medium)] border border-border p-0.5">
              <Button
                variant={scope === "priority" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setScope("priority")}
              >
                Prioritaires
              </Button>
              <Button
                variant={scope === "all" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setScope("all")}
              >
                Tous
              </Button>
            </div>
          )}
          onInspect={() => onInspect({
            title: "Fit × Reach Matrix with Momentum Halo",
            summary: "Le reach est un proxy de présence et de récence, pas une mesure de force politique.",
            meta: viewModel.trust.accountReach,
          })}
        >
          <div className="grid gap-4 px-5 py-4">
            <div className="relative overflow-hidden rounded-[var(--radius-medium)] border border-border bg-canvas p-4">
              <MatrixBackground />
              <div className="absolute left-5 top-5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-body">
                Haut potentiel / reach fragile
              </div>
              <div className="absolute bottom-5 right-5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-body">
                Coverage solide
              </div>
              <div className="relative h-[36rem]">
                {plottedAccounts.map(({ account, x, y, offsetX, offsetY, momentum, size }) => {
                  const isSelected = account.id === selectedAccount?.id

                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => onSelectAccount(account.id)}
                      className="group absolute rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      style={{
                        left: `calc(${x}% + ${offsetX}px)`,
                        top: `calc(${y}% + ${offsetY}px)`,
                        width: `${size}px`,
                        height: `${size}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                      aria-label={`${account.name}, potentiel ${account.potentialScore}/100, reach ${account.reachScore}/100, momentum ${momentum}/100`}
                      aria-pressed={isSelected}
                    >
                      <span
                        className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-heading shadow-none transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}
                      >
                        {account.name}
                      </span>
                      <span
                        className="absolute inset-[-8px] rounded-full border-2 border-info/40"
                        style={{ opacity: 0.18 + (momentum / 100) * 0.82 }}
                        aria-hidden="true"
                      />
                      <span
                        className={`absolute inset-0 rounded-full border ${isSelected ? "border-primary bg-primary text-primary-fg" : "border-surface bg-heading text-primary-fg group-hover:border-primary"}`}
                        aria-hidden="true"
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                        {account.name.slice(0, 2).toUpperCase()}
                      </span>
                    </button>
                  )
                })}
                <div className="absolute inset-x-4 bottom-1 flex justify-between text-[11px] text-muted">
                  <span>Reach faible</span>
                  <span>Reach fort</span>
                </div>
                <div className="absolute inset-y-4 left-1 flex flex-col justify-between text-[11px] text-muted">
                  <span>Potentiel élevé</span>
                  <span>Potentiel faible</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <MetricStrip label="Axe X" value="Reach proxy" context="Rôles présents + densité contacts + récence commerciale" />
              <MetricStrip label="Axe Y" value="Potentiel" context="legacy_folio_score réel + bonus heuristiques documentés" />
              <MetricStrip label="Halo" value="Momentum" context="Intensité mensuelle comparable sur la période" />
            </div>
          </div>
        </BlockFrame>

        <BlockFrame
          title="Alternative tabulaire exhaustive"
          subtitle="Lecture complète et keyboard-friendly de l'ensemble du portefeuille filtré."
          meta={viewModel.trust.accountPotential}
          onInspect={() => onInspect({
            title: "Alternative tabulaire exhaustive",
            summary: "Même lecture que la matrice, sous forme exhaustive et triable visuellement.",
            meta: viewModel.trust.accountPotential,
          })}
        >
          <div className="max-h-[30rem] overflow-auto px-5 py-4">
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.08em] text-muted">
                  <th className="pb-3 pr-4">Compte</th>
                  <th className="pb-3 pr-4">Potentiel</th>
                  <th className="pb-3 pr-4">Reach</th>
                  <th className="pb-3 pr-4">Momentum</th>
                  <th className="pb-3 pr-4">Gap</th>
                  <th className="pb-3 pr-4">Planifié</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...viewModel.accounts]
                  .sort((left, right) => getPriorityScore(right, viewModel.filters.period) - getPriorityScore(left, viewModel.filters.period))
                  .map((account) => {
                    const isSelected = account.id === selectedAccount?.id
                    return (
                      <tr key={account.id} className={isSelected ? "bg-primary/[0.04]" : ""}>
                        <td className="border-b border-border py-3 pr-4">
                          <button
                            type="button"
                            onClick={() => onSelectAccount(account.id)}
                            className="text-left focus-visible:outline-none"
                          >
                            <AccountIdentityLine account={account} selected={isSelected} />
                          </button>
                        </td>
                        <td className="border-b border-border py-3 pr-4 font-semibold text-heading">{account.potentialScore}</td>
                        <td className="border-b border-border py-3 pr-4">{account.reachScore}</td>
                        <td className="border-b border-border py-3 pr-4">{getMomentumScore(account, viewModel.filters.period)}</td>
                        <td className="border-b border-border py-3 pr-4">{account.reachGapScore}</td>
                        <td className="border-b border-border py-3 pr-4">{getPlannedEngagementCount(account, viewModel.filters.period)}</td>
                        <td className="border-b border-border py-3 text-body">{account.nextDecision}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </BlockFrame>
      </div>

      <div className="space-y-6">
        <BlockFrame
          title="Selected Account Context"
          subtitle="Buying committee, activité réalisée, engagement planifié et intelligence disponible synchronisés avec la sélection."
          meta={viewModel.trust.accountReach}
          onInspect={() => onInspect({
            title: "Selected Account Context",
            summary: "Le reach affiché est un proxy documenté de présence et de récence.",
            meta: viewModel.trust.accountReach,
          })}
        >
          {selectedAccount ? (
            <div className="space-y-5 px-5 py-4">
              <AccountIdentityLine account={selectedAccount} selected />
              <div className="grid grid-cols-2 gap-4">
                <MetricStrip label="Potentiel" value={`${selectedAccount.potentialScore}/100`} />
                <MetricStrip label="Reach proxy" value={`${selectedAccount.reachScore}/100`} />
                <MetricStrip label="Momentum" value={`${getMomentumScore(selectedAccount, viewModel.filters.period)}/100`} />
                <MetricStrip
                  label="Conversion aval"
                  value={selectedAccount.openOpportunityCount > 0 ? formatEuroCompact(selectedAccount.weightedPipeline) : "—"}
                  context={selectedAccount.openOpportunityCount > 0 ? `${selectedAccount.openOpportunityCount} opp. ouvertes` : "Aucune conversion ouverte"}
                />
              </div>

              <div className="grid gap-3 rounded-[var(--radius-medium)] border border-border bg-canvas p-4 text-sm text-body">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-heading">Dernière activité commerciale</span>
                  <span>{formatDateTime(selectedAccount.latestCommercialActivityAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-heading">Prochain engagement planifié</span>
                  <span>{formatDateTime(selectedAccount.latestPlannedEngagementAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-heading">Dernière intelligence</span>
                  <span>{formatDateTime(selectedAccount.latestIntelligenceAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-heading">Dernière mise à jour fiche</span>
                  <span>{formatDateTime(selectedAccount.latestDataUpdateAt)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Buying committee</p>
                {selectedAccount.committeeRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedAccount.committeeRoles.map((role) => (
                      <BadgeLine key={role} label={role.replaceAll("_", " ")} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-body">Aucun rôle comité exploitable n&apos;est encore identifié sur ce compte.</p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Intelligence disponible</p>
                <div className="flex flex-wrap gap-2">
                  <ProvenanceBadge origin={selectedAccount.potentialOrigin.primaryOrigin} />
                  {selectedAccount.potentialOrigin.origins.includes("REAL_NATIVE") && selectedAccount.potentialOrigin.primaryOrigin !== "REAL_NATIVE" ? <ProvenanceBadge origin="REAL_NATIVE" /> : null}
                  {selectedAccount.potentialOrigin.origins.includes("REAL_LEGACY") && selectedAccount.potentialOrigin.primaryOrigin !== "REAL_LEGACY" ? <ProvenanceBadge origin="REAL_LEGACY" /> : null}
                  {selectedAccount.potentialOrigin.origins.includes("PROXY") ? <ProvenanceBadge origin="PROXY" /> : null}
                </div>
              </div>

              <div className="rounded-[var(--radius-medium)] border border-border bg-canvas p-4">
                <p className="font-semibold text-heading">Lecture commerciale</p>
                <p className="mt-2 text-sm leading-6 text-body">{selectedAccount.nextDecision}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/prospection/accounts/${selectedAccount.id}`} className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
                  Hub compte
                </Link>

                <Link href="/prospection/approche-sectorielle" className="inline-flex h-10 items-center rounded-[var(--radius-medium)] border border-border px-4 text-sm font-semibold text-body transition-colors hover:bg-surface-hover hover:text-heading">
                  Secteurs
                </Link>
              </div>
            </div>
          ) : null}
        </BlockFrame>
      </div>
    </div>
  )
}

function MatrixBackground() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => {
        const value = 20 + index * 20
        return (
          <g key={value}>
            <line x1={value} y1={0} x2={value} y2={100} stroke="var(--color-border)" strokeWidth="0.45" />
            <line x1={0} y1={value} x2={100} y2={value} stroke="var(--color-border)" strokeWidth="0.45" />
          </g>
        )
      })}
      <rect x={0} y={0} width={50} height={50} fill="var(--color-warning)" opacity="0.05" />
      <rect x={50} y={0} width={50} height={50} fill="var(--color-success)" opacity="0.05" />
    </svg>
  )
}

function BadgeLine({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-body">
      {label}
    </span>
  )
}
