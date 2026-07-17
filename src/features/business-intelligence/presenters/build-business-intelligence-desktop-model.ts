import { BusinessIntelligenceSnapshot } from "../data/business-intelligence-types"
import { buildAccountPrioritizationModel, AccountPriorityItem } from "../models/build-account-prioritization-model"
import { buildAccountAttackModel, AccountAttackItem } from "../models/build-account-attack-model"
import { buildSectorActivationModel } from "../models/build-sector-activation-model"
import { SectorActivationWindow, SectorActivationSector } from "@/lib/prospection/sector-activation-types"

export interface BusinessIntelligenceDesktopViewModel {
  generatedAt: string
  hasDemoData: boolean
  kpis: {
    priorityAccountsCount: number
    openWindowsCount: number
    activeSectorsCount: number
    averageConfidence: number | null
  }
  strategicBrief: {
    openWindows: number
    insufficientlyCoveredPriorityAccounts: number
    bestSignalSector: string | null
    topArbitrationAccount: string | null
    hottestWindow: string | null
    mainCoverageDeficit: string | null
  }
  priorityBoard: AccountPriorityItem[]
  matrixPoints: {
    accountId: string
    name: string
    potential: number
    reach: number
    priority: number
  }[]
  attackPanelData: Record<string, AccountAttackItem | null>
  windowsLedger: SectorActivationWindow[]
  panorama: SectorActivationSector[]
}

export function buildBusinessIntelligenceDesktopModel(
  snapshot: BusinessIntelligenceSnapshot
): BusinessIntelligenceDesktopViewModel {
  const priorityBoard = buildAccountPrioritizationModel(snapshot)
  
  // KPI Calculations
  const priorityAccountsCount = priorityBoard.filter(a => a.priority >= 50).length
  
  // Windows logic: buildSectorActivationModel was already called inside the snapshot builder actually,
  // but we can reuse the snapshot's windows and sectors directly since they are already built.
  const openWindows = snapshot.windows.filter(w => w.isOpenNow)
  const openWindowsCount = openWindows.length
  
  const activeSectors = snapshot.sectors.filter(s => s.status === "active")
  const activeSectorsCount = activeSectors.length

  const accountsWithNativeScore = priorityBoard.filter(a => a.nativeScore !== null)
  const averageConfidence = accountsWithNativeScore.length > 0
    ? Math.round(accountsWithNativeScore.reduce((sum, a) => sum + (a.nativeScore?.confidence ?? 0), 0) / accountsWithNativeScore.length)
    : null

  // Strategic Brief
  const insufficientlyCoveredPriorityAccounts = priorityBoard.filter(a => a.priority >= 60 && a.reach < 50).length
  
  const bestSignalSector = openWindows.length > 0 
    ? openWindows.toSorted((a, b) => b.urgencyScore - a.urgencyScore)[0]?.sectorName ?? null
    : null

  const topArbitrationAccount = priorityBoard.find(a => a.priority >= 70 && a.reach < 40)?.name ?? null
  const hottestWindow = openWindows.length > 0 
    ? openWindows.toSorted((a, b) => b.urgencyScore - a.urgencyScore)[0]?.title ?? null
    : null

  const mainCoverageDeficit = priorityBoard.some(a => a.reach < 30) 
    ? "Couverture relationnelle faible sur le Top 20" 
    : "Couverture native incomplète"

  // Attack Panel Data for all visible accounts
  const attackPanelData: Record<string, AccountAttackItem | null> = {}
  for (const account of priorityBoard.slice(0, 50)) { // limit to avoid heavy processing
    attackPanelData[account.accountId] = buildAccountAttackModel(snapshot, account.accountId)
  }

  // Matrix
  const matrixPoints = priorityBoard.map(a => ({
    accountId: a.accountId,
    name: a.name,
    potential: a.potential,
    reach: a.reach,
    priority: a.priority,
  }))

  return {
    generatedAt: snapshot.generatedAt,
    hasDemoData: snapshot.dataQuality.hasDemoData,
    kpis: {
      priorityAccountsCount,
      openWindowsCount,
      activeSectorsCount,
      averageConfidence,
    },
    strategicBrief: {
      openWindows: openWindowsCount,
      insufficientlyCoveredPriorityAccounts,
      bestSignalSector,
      topArbitrationAccount,
      hottestWindow,
      mainCoverageDeficit,
    },
    priorityBoard: priorityBoard.slice(0, 10), // Limit to 10 for the board
    matrixPoints,
    attackPanelData,
    windowsLedger: snapshot.windows.slice(0, 5), // Limit to top 5
    panorama: snapshot.sectors.slice(0, 6), // Limit to 6
  }
}
