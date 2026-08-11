import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId } from "@/lib/supabase/workspace"
import { extractCrmLauncherAccountIdsFromUiPrefs } from "@/lib/crm/account-launcher-preferences"

type CrmLauncherAccount = {
  id: string
  name: string
  sector: string | null
  status: string | null
  score: number | null
  website: string | null
  logoPath: string | null
  contactCount: number
  openOpportunitiesCount?: number
  weightedPipeline?: number
  lastActivityAt?: string | null
}

type AccountViewRow = {
  id: string
  name: string
  sector: string | null
  relation_type: string
  legacy_folio_score: number | string | null
  website: string | null
  logo_path: string | null
  nb_contacts: number | null
}

// Neutralise les caractères qui ont une signification dans la grammaire de
// filtre PostgREST (`.or(...)`) : sans ça, un `q` forgé peut injecter des
// conditions supplémentaires ou casser la requête. La RLS confine déjà au
// workspace, mais on ferme la porte à toute évasion de filtre intra-workspace.
function sanitizeOrFilterTerm(value: string): string {
  return value.replace(/[,()*\\":]/g, " ").trim().slice(0, 100)
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
    status: row.relation_type,
    score: toNumber(row.legacy_folio_score),
    website: row.website,
    logoPath: row.logo_path,
    contactCount: Number(row.nb_contacts ?? 0),
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()

  // 1. Authentification
  // Lecture seule sur un chemin interactif : getClaims() (vérification locale du
  // JWT) plutôt que getUser() et son aller-retour de ~170 ms vers l'API Auth.
  // Les routes d'écriture gardent getUser().
  const userId = await getCurrentUserId()

  if (!userId) {
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
        .eq("id", userId)
        .maybeSingle()

      const pinnedIds = extractCrmLauncherAccountIdsFromUiPrefs(profile?.ui_prefs)

      if (pinnedIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbAccounts, error: dbError } = await (supabase as any)
          .from("v_crm_account_list")
          .select("id, name, sector, relation_type, legacy_folio_score, website, logo_path, nb_contacts")
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
      const safeTerm = sanitizeOrFilterTerm(q)
      if (!safeTerm) {
        // Fallback personal si query de recherche vide (ou vidée après sanitize)
        return GET(new Request(`${request.url.split("?")[0]}?mode=personal&limit=${limit}`))
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbAccounts, error: dbError } = await (supabase as any)
        .from("v_crm_account_list")
        .select("id, name, sector, relation_type, legacy_folio_score, website, logo_path, nb_contacts")
        .or(`name.ilike.%${safeTerm}%,sector.ilike.%${safeTerm}%`)
        .limit(limit)

      if (dbError) throw dbError
      accounts = ((dbAccounts || []) as AccountViewRow[]).map(mapAccountRow)
    } 
    
    else if (mode === "recent") {
      // Compte "modifié" = fiche compte éditée, ou entité rattachée créée/éditée
      // (contact, événement agenda, interaction — dont les mails générés depuis
      // le cockpit via intel-020). Agrégation en mémoire sur des tables courtes
      // (dizaines à centaines de lignes), même pattern que les modes ci-dessus —
      // pas de vue SQL dédiée pour un besoin de cette taille.
      const [companiesRes, contactsRes, eventsRes, interactionsRes] = await Promise.all([
        supabase.from("companies").select("id, updated_at"),
        supabase.from("contacts").select("company_id, updated_at"),
        // calendar_events n'a pas le trigger set_updated_at (cf. CLAUDE.md) :
        // on prend le max(created_at, updated_at) pour ne pas dépendre de lui.
        supabase.from("calendar_events").select("company_id, created_at, updated_at"),
        // created_at (horodatage serveur), pas occurred_at (antidatable par l'utilisateur).
        supabase.from("interactions").select("company_id, created_at"),
      ])

      if (companiesRes.error) throw companiesRes.error
      if (contactsRes.error) throw contactsRes.error
      if (eventsRes.error) throw eventsRes.error
      if (interactionsRes.error) throw interactionsRes.error

      const lastActivityByCompany = new Map<string, string>()
      const bump = (companyId: string | null | undefined, timestamp: string | null | undefined) => {
        if (!companyId || !timestamp) return
        const current = lastActivityByCompany.get(companyId)
        if (!current || timestamp > current) lastActivityByCompany.set(companyId, timestamp)
      }

      for (const row of companiesRes.data || []) bump(row.id, row.updated_at)
      for (const row of contactsRes.data || []) bump(row.company_id, row.updated_at)
      for (const row of eventsRes.data || []) {
        bump(row.company_id, row.created_at)
        bump(row.company_id, row.updated_at)
      }
      for (const row of interactionsRes.data || []) bump(row.company_id, row.created_at)

      const sortedCompanies = [...lastActivityByCompany.entries()]
        .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
        .slice(0, limit)

      const targetIds = sortedCompanies.map(([companyId]) => companyId)

      if (targetIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbAccounts, error: dbError } = await (supabase as any)
          .from("v_crm_account_list")
          .select("id, name, sector, relation_type, legacy_folio_score, website, logo_path, nb_contacts")
          .in("id", targetIds)

        if (dbError) throw dbError

        const mapped = ((dbAccounts || []) as AccountViewRow[]).map(mapAccountRow)
        const activityMap = new Map(sortedCompanies)

        accounts = mapped
          .map((acc) => ({
            ...acc,
            lastActivityAt: activityMap.get(acc.id) ?? null,
          }))
          // Conserver l'ordre trié (le plus récemment édité en premier)
          .sort((a, b) => targetIds.indexOf(a.id) - targetIds.indexOf(b.id))
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
          .select("id, name, sector, relation_type, legacy_folio_score, website, logo_path, nb_contacts")
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
