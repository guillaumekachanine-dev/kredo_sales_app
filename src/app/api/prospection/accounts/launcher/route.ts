import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractCrmLauncherAccountIdsFromUiPrefs } from "@/lib/crm/account-launcher-preferences"

export const dynamic = "force-dynamic"

type CrmLauncherAccount = {
  id: string
  name: string
  sector: string | null
  status: string | null
  score: number | null
  website: string | null
  logoPath: string | null
  contactCount: number
  signalCountWeek?: number
  openOpportunitiesCount?: number
  weightedPipeline?: number
}

type AccountViewRow = {
  id: string
  name: string
  sector: string | null
  lifecycle_status: string
  legacy_folio_score: number | string | null
  website: string | null
  logo_path: string | null
  nb_contacts: number | null
}

function toNumber(value: number | string | null): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function isOpenOpportunityStage(stage: string | null | undefined): boolean {
  if (!stage) return false
  return !["gagne", "perdu", "abandonne", "non_traitee"].includes(stage)
}

function mapAccountRow(row: AccountViewRow): CrmLauncherAccount {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    status: row.lifecycle_status,
    score: toNumber(row.legacy_folio_score),
    website: row.website,
    logoPath: row.logo_path,
    contactCount: Number(row.nb_contacts ?? 0),
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()

  // 1. Authentification
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  // 2. Query Params
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("mode") || "personal"
  const q = searchParams.get("q") || ""
  
  let limit = 10
  const limitParam = searchParams.get("limit")
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10)
    if (!isNaN(parsedLimit)) {
      limit = Math.max(1, Math.min(20, parsedLimit))
    }
  }

  try {
    let accounts: CrmLauncherAccount[] = []

    if (mode === "personal") {
      // Lire les favoris
      const { data: profile } = await supabase
        .from("profiles")
        .select("ui_prefs")
        .eq("id", user.id)
        .maybeSingle()

      const pinnedIds = extractCrmLauncherAccountIdsFromUiPrefs(profile?.ui_prefs)

      if (pinnedIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbAccounts, error: dbError } = await (supabase as any)
          .from("v_crm_account_list")
          .select("id, name, sector, lifecycle_status, legacy_folio_score, website, logo_path, nb_contacts")
          .in("id", pinnedIds)

        if (dbError) throw dbError

        const mapped = ((dbAccounts || []) as AccountViewRow[]).map(mapAccountRow)
        // Conserver l'ordre exact des pinnedIds
        const orderMap = new Map(pinnedIds.map((id, idx) => [id, idx]))
        accounts = mapped.sort((a, b) => {
          const idxA = orderMap.get(a.id) ?? 999
          const idxB = orderMap.get(b.id) ?? 999
          return idxA - idxB
        })
      }
    } 
    
    else if (mode === "search") {
      if (!q.trim()) {
        // Fallback personal si query de recherche vide
        return GET(new Request(`${request.url.split("?")[0]}?mode=personal&limit=${limit}`))
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbAccounts, error: dbError } = await (supabase as any)
        .from("v_crm_account_list")
        .select("id, name, sector, lifecycle_status, legacy_folio_score, website, logo_path, nb_contacts")
        .or(`name.ilike.%${q}%,sector.ilike.%${q}%`)
        .limit(limit)

      if (dbError) throw dbError
      accounts = ((dbAccounts || []) as AccountViewRow[]).map(mapAccountRow)
    } 
    
    else if (mode === "news") {
      // 7 derniers jours (option la plus simple)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // Récupérer les signaux récents
      const { data: signals, error: signalsError } = await supabase
        .from("account_signals")
        .select("company_id, global_score")
        .gte("detected_at", sevenDaysAgo)

      if (signalsError) throw signalsError

      // Agréger en mémoire JS
      const companyStats = new Map<string, { count: number; scoreSum: number }>()
      for (const sig of signals || []) {
        if (!sig.company_id) continue
        const stats = companyStats.get(sig.company_id) || { count: 0, scoreSum: 0 }
        stats.count += 1
        stats.scoreSum += Number(sig.global_score || 0)
        companyStats.set(sig.company_id, stats)
      }

      // Trier par nombre de signaux puis par score moyen
      const sortedCompanies = [...companyStats.entries()]
        .map(([companyId, stats]) => ({
          companyId,
          count: stats.count,
          avgScore: stats.scoreSum / stats.count,
        }))
        .sort((a, b) => b.count - a.count || b.avgScore - a.avgScore)
        .slice(0, limit)

      const targetIds = sortedCompanies.map((c) => c.companyId)

      if (targetIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbAccounts, error: dbError } = await (supabase as any)
          .from("v_crm_account_list")
          .select("id, name, sector, lifecycle_status, legacy_folio_score, website, logo_path, nb_contacts")
          .in("id", targetIds)

        if (dbError) throw dbError

        const mapped = ((dbAccounts || []) as AccountViewRow[]).map(mapAccountRow)
        const statsMap = new Map(sortedCompanies.map((c) => [c.companyId, c.count]))
        
        accounts = mapped
          .map((acc) => ({
            ...acc,
            signalCountWeek: statsMap.get(acc.id) || 0,
          }))
          // Conserver l'ordre trié
          .sort((a, b) => {
            const idxA = targetIds.indexOf(a.id)
            const idxB = targetIds.indexOf(b.id)
            return idxA - idxB
          })
      }
    } 
    
    else if (mode === "opportunities") {
      // Récupérer toutes les opportunités actives/ouvertes
      const { data: opportunities, error: oppsError } = await supabase
        .from("opportunities")
        .select("company_id, stage, weighted_gain")

      if (oppsError) throw oppsError

      // Filtrer et agréger en mémoire JS
      const companyStats = new Map<string, { count: number; weightedPipeline: number }>()
      for (const opp of opportunities || []) {
        if (!opp.company_id || !isOpenOpportunityStage(opp.stage)) continue
        const stats = companyStats.get(opp.company_id) || { count: 0, weightedPipeline: 0 }
        stats.count += 1
        stats.weightedPipeline += Number(opp.weighted_gain || 0)
        companyStats.set(opp.company_id, stats)
      }

      // Trier par SUM(weighted_gain) DESC puis par COUNT(*) DESC
      const sortedCompanies = [...companyStats.entries()]
        .map(([companyId, stats]) => ({
          companyId,
          count: stats.count,
          weightedPipeline: stats.weightedPipeline,
        }))
        .sort((a, b) => b.weightedPipeline - a.weightedPipeline || b.count - a.count)
        .slice(0, limit)

      const targetIds = sortedCompanies.map((c) => c.companyId)

      if (targetIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbAccounts, error: dbError } = await (supabase as any)
          .from("v_crm_account_list")
          .select("id, name, sector, lifecycle_status, legacy_folio_score, website, logo_path, nb_contacts")
          .in("id", targetIds)

        if (dbError) throw dbError

        const mapped = ((dbAccounts || []) as AccountViewRow[]).map(mapAccountRow)
        const statsMap = new Map(sortedCompanies.map((c) => [c.companyId, c]))

        accounts = mapped
          .map((acc) => {
            const stats = statsMap.get(acc.id)
            return {
              ...acc,
              openOpportunitiesCount: stats?.count || 0,
              weightedPipeline: stats?.weightedPipeline || 0,
            }
          })
          // Conserver l'ordre trié
          .sort((a, b) => {
            const idxA = targetIds.indexOf(a.id)
            const idxB = targetIds.indexOf(b.id)
            return idxA - idxB
          })
      }
    } 
    
    else {
      return NextResponse.json({ error: "Mode invalide" }, { status: 400 })
    }

    return NextResponse.json({
      items: accounts,
      mode,
    })
  } catch (error) {
    console.error("[crm-launcher] API error:", error)
    return NextResponse.json({ error: "Une erreur est survenue lors du chargement des données" }, { status: 500 })
  }
}
