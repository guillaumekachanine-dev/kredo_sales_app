import type { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import {
  buildAccountAttackModel,
  type AccountAttackItem,
} from "../models/build-account-attack-model"
import {
  buildAccountPrioritizationModel,
  type AccountPriorityItem,
} from "../models/build-account-prioritization-model"
import {
  buildSectorPlaybookModel,
  type BusinessIntelligenceSectorProfile,
} from "../models/build-sector-playbook-model"
import type { SectorActivationWindow } from "@/lib/prospection/sector-activation-types"

export type BusinessIntelligenceMobilePeriod = 30 | 90 | 180

export interface BusinessIntelligenceMobileAccount extends AccountPriorityItem {
  sectorName: string | null
  attack: AccountAttackItem | null
}

export interface BusinessIntelligenceMobilePeriodModel {
  accounts: BusinessIntelligenceMobileAccount[]
  accountsBySectorId: Record<string, BusinessIntelligenceMobileAccount[]>
  recommendedAccountId: string | null
  metrics: {
    priorityAccountsCount: number
    openWindowsCount: number
    averageConfidence: number | null
  }
  brief: {
    recommendedAccountName: string | null
    mainSignal: string | null
    whyNow: string | null
    nextAction: string | null
  }
}

export interface BusinessIntelligenceMobileSector {
  id: string
  name: string
  status: "active" | "watch"
  attractivenessScore: number | null
  linkedAccountCount: number
  openWindowCount: number
  topPracticeLabel: string | null
  averageReachScore: number | null
  profile: BusinessIntelligenceSectorProfile | null
}

export interface BusinessIntelligenceMobileWindow extends SectorActivationWindow {
  priorityAccountId: string | null
}

export interface BusinessIntelligenceMobileViewModel {
  state: "ready" | "error"
  generatedAt: string
  hasDemoData: boolean
  dataQuality: BusinessIntelligenceSnapshot["dataQuality"]
  trust: BusinessIntelligenceSnapshot["trust"]
  periods: Record<BusinessIntelligenceMobilePeriod, BusinessIntelligenceMobilePeriodModel>
  windows: BusinessIntelligenceMobileWindow[]
  activeSectors: BusinessIntelligenceMobileSector[]
  watchSectors: BusinessIntelligenceMobileSector[]
}

export function resolveMobilePriorityAccountId(
  accounts: readonly BusinessIntelligenceMobileAccount[],
  selectedAccountId: string | null,
): string | null {
  if (selectedAccountId && accounts.some((account) => account.accountId === selectedAccountId)) {
    return selectedAccountId
  }
  return accounts[0]?.accountId ?? null
}

export function resolveMobileWindowAccountId(
  window: Pick<BusinessIntelligenceMobileWindow, "priorityAccountId">,
): string | null {
  return window.priorityAccountId
}

export function getMobileSectorAccounts(
  period: BusinessIntelligenceMobilePeriodModel,
  sectorId: string | "all",
): BusinessIntelligenceMobileAccount[] {
  return sectorId === "all" ? period.accounts : period.accountsBySectorId[sectorId] ?? []
}

export function resolveMobileSectorAccountId(
  period: BusinessIntelligenceMobilePeriodModel,
  sectorId: string | "all",
  requestedAccountId: string | null,
): string | null {
  return resolveMobilePriorityAccountId(
    getMobileSectorAccounts(period, sectorId),
    requestedAccountId,
  )
}

function buildPeriodModel(
  snapshot: BusinessIntelligenceSnapshot,
  period: BusinessIntelligenceMobilePeriod,
): BusinessIntelligenceMobilePeriodModel {
  const sectorsById = new Map(snapshot.sectors.map((sector) => [sector.id, sector.name]))
  const priorityAccounts = buildAccountPrioritizationModel(snapshot, { period })
  const enrichedAccounts = new Map<string, BusinessIntelligenceMobileAccount>()
  const enrichAccount = (account: AccountPriorityItem) => {
    const cached = enrichedAccounts.get(account.accountId)
    if (cached) return cached

    const enriched = {
      ...account,
      sectorName: account.sectorId ? sectorsById.get(account.sectorId) ?? null : null,
      attack: buildAccountAttackModel(snapshot, account.accountId, { period }),
    }
    enrichedAccounts.set(account.accountId, enriched)
    return enriched
  }
  const accounts = priorityAccounts.slice(0, 5).map(enrichAccount)
  const accountsBySectorId = priorityAccounts.reduce<Record<string, BusinessIntelligenceMobileAccount[]>>(
    (groups, account) => {
      if (!account.sectorId) return groups
      const group = groups[account.sectorId] ?? []
      if (group.length < 5) group.push(enrichAccount(account))
      groups[account.sectorId] = group
      return groups
    },
    {},
  )
  const recommended = accounts[0] ?? null
  const nativeScores = accounts.filter((account) => account.nativeScore !== null)

  return {
    accounts,
    accountsBySectorId,
    recommendedAccountId: recommended?.accountId ?? null,
    metrics: {
      priorityAccountsCount: accounts.filter((account) => account.priority >= 50).length,
      openWindowsCount: snapshot.windows.filter((window) => window.isOpenNow).length,
      averageConfidence: nativeScores.length > 0
        ? Math.round(nativeScores.reduce((total, account) => total + (account.nativeScore?.confidence ?? 0), 0) / nativeScores.length)
        : null,
    },
    brief: {
      recommendedAccountName: recommended?.name ?? null,
      mainSignal: recommended?.topSignal?.title ?? recommended?.attack?.topSignal?.title ?? null,
      whyNow: recommended?.attack?.approachAngle ?? recommended?.topSignal?.summary ?? null,
      nextAction: recommended?.nextAction ?? recommended?.attack?.nextAction ?? null,
    },
  }
}

export function buildBusinessIntelligenceMobileModel(
  snapshot: BusinessIntelligenceSnapshot,
): BusinessIntelligenceMobileViewModel {
  const period30 = buildPeriodModel(snapshot, 30)
  const priorityAccountIds = new Set(period30.accounts.map((account) => account.accountId))
  const windows = snapshot.windows.map((window) => ({
    ...window,
    priorityAccountId: window.exposedAccountIds.find((accountId) => priorityAccountIds.has(accountId)) ?? null,
  }))
  const sectors = snapshot.sectors.map((sector) => ({
    id: sector.id,
    name: sector.name,
    status: sector.status === "active" ? "active" as const : "watch" as const,
    attractivenessScore: sector.attractivenessScore,
    linkedAccountCount: sector.linkedAccountCount,
    openWindowCount: sector.openWindowCount,
    topPracticeLabel: sector.topPracticeLabel ?? null,
    averageReachScore: sector.averageReachScore,
    profile: buildSectorPlaybookModel(snapshot, sector.id),
  }))

  return {
    state: snapshot.state,
    generatedAt: snapshot.generatedAt,
    hasDemoData: snapshot.dataQuality.hasDemoData,
    dataQuality: snapshot.dataQuality,
    trust: snapshot.trust,
    periods: {
      30: period30,
      90: buildPeriodModel(snapshot, 90),
      180: buildPeriodModel(snapshot, 180),
    },
    windows,
    activeSectors: sectors.filter((sector) => sector.status === "active"),
    watchSectors: sectors.filter((sector) => sector.status === "watch"),
  }
}
