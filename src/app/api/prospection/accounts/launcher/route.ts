import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId } from "@/lib/supabase/workspace"
import { extractCrmLauncherRecentIdsFromUiPrefs } from "@/lib/crm/account-launcher-preferences"

type CrmLauncherAccount = {
  id: string
  name: string
  sector: string | null
  status: string | null
  website: string | null
  logoPath: string | null
  contactCount: number
  lastActivityAt?: string | null
  realizedRevenue?: number
}

type AccountViewRow = {
  id: string
  name: string
  sector: string | null
  relation_type: string
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

function mapAccountRow(row: AccountViewRow): CrmLauncherAccount {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    status: row.relation_type,
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
  const mode = searchParams.get("mode") || "recent"
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

    if (mode === "search") {
      const safeTerm = sanitizeOrFilterTerm(q)
      if (!safeTerm) {
        // Fallback "récents" si query de recherche vide (ou vidée après sanitize)
        return GET(new Request(`${request.url.split("?")[0]}?mode=recent&limit=${limit}`))
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbAccounts, error: dbError } = await (supabase as any)
        .from("v_crm_account_list")
        .select("id, name, sector, relation_type, website, logo_path, nb_contacts")
        .or(`name.ilike.%${safeTerm}%,sector.ilike.%${safeTerm}%`)
        .limit(limit)

      if (dbError) throw dbError
      accounts = ((dbAccounts || []) as AccountViewRow[]).map(mapAccountRow)
    }

    else if (mode === "recent") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("ui_prefs")
        .eq("id", userId)
        .maybeSingle()

      const visitedIds = extractCrmLauncherRecentIdsFromUiPrefs(profile?.ui_prefs).slice(0, limit)

      if (visitedIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbAccounts, error: dbError } = await (supabase as any)
          .from("v_crm_account_list")
          .select("id, name, sector, relation_type, website, logo_path, nb_contacts")
          .in("id", visitedIds)

        if (dbError) throw dbError

        const mapped = ((dbAccounts || []) as AccountViewRow[]).map(mapAccountRow)
        // Conserver l'ordre exact de l'historique (le plus récemment consulté en tête).
        const orderMap = new Map(visitedIds.map((id, idx) => [id, idx]))
        accounts = mapped.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
      } else {
        // Aucun historique de consultation tracé pour cet utilisateur (premier usage,
        // ou navigateur/poste jamais synchronisé) : on retombe sur les comptes les
        // plus récemment modifiés (fiche compte éditée, ou entité rattachée
        // créée/éditée — contact, événement agenda, interaction). Agrégation en
        // mémoire sur des tables courtes (dizaines à centaines de lignes) — pas de
        // vue SQL dédiée pour un besoin de cette taille.
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
            .select("id, name, sector, relation_type, website, logo_path, nb_contacts")
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
    }

    else if (mode === "clients") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbAccounts, error: dbError } = await (supabase as any)
        .from("v_crm_account_list")
        .select("id, name, sector, relation_type, website, logo_path, nb_contacts")
        .eq("relation_type", "client")

      if (dbError) throw dbError

      const clientAccounts = (dbAccounts || []) as AccountViewRow[]
      const clientIds = clientAccounts.map((row) => row.id)

      // CA réalisé = somme du revenu trimestriel dérivé des CRA
      // (v_mission_quarterly_revenue), toutes périodes confondues — pas de
      // fenêtre glissante, l'onglet reflète le CA historique total du client.
      const revenueByCompany = new Map<string, number>()
      if (clientIds.length > 0) {
        const { data: revenueRows, error: revenueError } = await supabase
          .from("v_mission_quarterly_revenue")
          .select("company_id, revenue")
          .in("company_id", clientIds)

        if (revenueError) throw revenueError

        for (const row of revenueRows || []) {
          if (!row.company_id) continue
          revenueByCompany.set(
            row.company_id,
            (revenueByCompany.get(row.company_id) || 0) + Number(row.revenue || 0),
          )
        }
      }

      accounts = clientAccounts
        .map((row) => ({
          ...mapAccountRow(row),
          realizedRevenue: revenueByCompany.get(row.id) || 0,
        }))
        .sort((a, b) => (b.realizedRevenue || 0) - (a.realizedRevenue || 0))
        .slice(0, limit)
    }

    else if (mode === "targets") {
      // Cibles prioritaires de prospection : le scoring qui alimentera cet
      // onglet dépend de la page Prospection, non finalisée (cf. CLAUDE.md
      // § Chantiers en cours). Vide explicite tant que la source n'existe
      // pas — jamais de remplissage arbitraire dans un module de navigation.
      accounts = []
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
