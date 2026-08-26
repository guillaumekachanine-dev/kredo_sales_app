import type { CompanyRelationType } from "@/lib/accounts-contacts/company-constants"

export type AccountIntelligenceHomeFinancials = {
  relationType: CompanyRelationType
  realizedRevenue: number | null
  clientRank: number | null
  clientCount: number | null
}
