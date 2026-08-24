import type {
  DashboardLabAccount,
  DashboardLabData,
  DashboardLabPeriod,
  DashboardLabSectorWindow,
  DataTrustMeta,
} from "@/lib/prospection/dashboard-lab-data"
import type {
  FutureDemoSignalFixture,
  FutureDemoWindowFixture,
} from "@/lib/prospection/dashboard-lab-fixtures"

export type DashboardLabConcept = "command-center" | "account-intelligence" | "sector-signal"

export type DashboardLabFilters = {
  period: DashboardLabPeriod
  sector: string
  lifecycle: string
  priority: string
}

export type DashboardLabInspection = {
  title: string
  summary: string
  meta: DataTrustMeta
}

export type DashboardLabWindowView = DashboardLabSectorWindow | FutureDemoWindowFixture

export type DashboardLabSignalView = FutureDemoSignalFixture

export type DashboardLabViewModel = {
  generatedAt: string
  filters: DashboardLabFilters
  accounts: DashboardLabAccount[]
  selectedAccount: DashboardLabAccount | null
  selectedAccountId: string | null
  trust: DashboardLabData["trust"]
  sectors: DashboardLabData["sectors"]
  windows: DashboardLabWindowView[]
  demoSignals: DashboardLabSignalView[]
  demoEnabled: boolean
  summary: {
    totalAccounts: number
    filteredAccounts: number
    accountsWithRecentActivity: number
    linkedSectorAccounts: number
    activeWindows: number
  }
}
