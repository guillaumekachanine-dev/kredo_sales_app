import "server-only"

import { createClient } from "@/lib/supabase/server"
import { normalizeCompanyRelationType, type CompanyRelationType } from "@/lib/accounts-contacts/company-constants"

export type AccountIntelligenceHomeFinancials = {
  relationType: CompanyRelationType
  realizedRevenue: number | null
  clientRank: number | null
  clientCount: number | null
}

export async function getAccountIntelligenceHomeFinancials(
  companyId: string,
): Promise<AccountIntelligenceHomeFinancials> {
  const supabase = await createClient()

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("relation_type")
    .eq("id", companyId)
    .maybeSingle()

  if (companyError) {
    console.error("Unable to load Account Intelligence relation type:", companyError)
    return {
      relationType: "prospect",
      realizedRevenue: null,
      clientRank: null,
      clientCount: null,
    }
  }

  const relationType = normalizeCompanyRelationType(company?.relation_type)

  if (relationType !== "client") {
    return {
      relationType,
      realizedRevenue: null,
      clientRank: null,
      clientCount: null,
    }
  }

  const { data: clients, error: clientsError } = await supabase
    .from("companies")
    .select("id")
    .eq("relation_type", "client")

  if (clientsError) {
    console.error("Unable to load Account Intelligence client portfolio:", clientsError)
    return {
      relationType,
      realizedRevenue: null,
      clientRank: null,
      clientCount: null,
    }
  }

  const clientIds = (clients ?? []).map((row) => row.id)
  if (clientIds.length === 0) {
    return {
      relationType,
      realizedRevenue: 0,
      clientRank: null,
      clientCount: 0,
    }
  }

  const { data: revenueRows, error: revenueError } = await supabase
    .from("v_mission_quarterly_revenue")
    .select("company_id,revenue")
    .in("company_id", clientIds)

  if (revenueError) {
    console.error("Unable to load Account Intelligence realized revenue:", revenueError)
    return {
      relationType,
      realizedRevenue: null,
      clientRank: null,
      clientCount: clientIds.length,
    }
  }

  const revenueByCompany = new Map<string, number>()
  for (const row of revenueRows ?? []) {
    if (!row.company_id) continue
    revenueByCompany.set(
      row.company_id,
      (revenueByCompany.get(row.company_id) ?? 0) + Number(row.revenue ?? 0),
    )
  }

  const ranking = clientIds
    .map((id) => ({ id, revenue: revenueByCompany.get(id) ?? 0 }))
    .sort((a, b) => b.revenue - a.revenue)

  const rankIndex = ranking.findIndex((row) => row.id === companyId)

  return {
    relationType,
    realizedRevenue: revenueByCompany.get(companyId) ?? 0,
    clientRank: rankIndex >= 0 ? rankIndex + 1 : null,
    clientCount: ranking.length,
  }
}
