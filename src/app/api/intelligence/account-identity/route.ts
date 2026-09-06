import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  REGISTRY_SEARCH_PER_PAGE,
  buildRegistrySearchQueries,
  normalizeRegistryResult,
  normalizeSiren,
  rankIdentityCandidates,
  type AccountIdentityInput,
  type RegistryCandidate,
} from "@/lib/intelligence/entity-resolution"

// Candidats d'identité légale soumis à la confirmation humaine
// (`AccountScanIdentityConfirm`).
//
// ── POURQUOI CETTE ROUTE A ÉTÉ REPRISE (Lot 1 Account Knowledge V4) ──────────
// Elle interrogeait le registre avec `"<nom> <hq_location>"`, `per_page=5`, et
// rendait les résultats **dans l'ordre brut de l'API**, sans le moindre score.
// L'interface cochait le premier. Sur le compte « MMV » (résidences de montagne,
// ni raison sociale ni siège au CRM), le premier candidat était « DEPIL TECH » :
// un humain l'a confirmé en un clic, et six propositions d'enrichissement portant
// l'identité d'un autre compte du CRM en sont sorties.
//
// Désormais : plusieurs requêtes (raison sociale ET nom d'usage), dix résultats
// chacune, tri par le score de `entity-resolution.ts`, raisons exposées, et
// présélection **uniquement** si le module trancherait de lui-même.

const REGISTRY_ENDPOINT = "https://recherche-entreprises.api.gouv.fr/search"
const MAX_QUERIES = 3
const MAX_CANDIDATES = 6

async function searchRegistry(query: string): Promise<RegistryCandidate[]> {
  const url = `${REGISTRY_ENDPOINT}?q=${encodeURIComponent(query)}&per_page=${REGISTRY_SEARCH_PER_PAGE}`
  const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } })
  if (!response.ok) {
    console.error("[account-identity] registre", response.status, "sur", query)
    return []
  }
  const json = (await response.json()) as { results?: unknown[] }
  return (json.results ?? [])
    .map((raw) => normalizeRegistryResult(raw as Record<string, unknown>))
    .filter((candidate): candidate is RegistryCandidate => candidate !== null)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "Workspace introuvable" }, { status: 403 })
  }

  let body: { companyId: string; selectedSiren?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 })
  }

  const { companyId, selectedSiren } = body
  if (!companyId) {
    return NextResponse.json({ error: "companyId requis" }, { status: 400 })
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("siren, naf_code, name, legal_name, hq_location, sector, employee_count")
    .eq("id", companyId)
    .eq("workspace_id", profile.workspace_id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: "Compagnie introuvable ou accès refusé" }, { status: 404 })
  }

  const account: AccountIdentityInput = {
    name: company.name,
    legalName: company.legal_name,
    hqLocation: company.hq_location,
    sector: company.sector,
    segment: null,
    employeeCount: company.employee_count,
    // Volontairement `null` : cette route sert à CHOISIR l'entité. Un SIREN déjà
    // connu court-circuiterait la comparaison et masquerait une erreur existante.
    knownSiren: null,
    knownNafCode: company.naf_code,
  }

  // Un SIREN explicitement demandé (retour arrière de l'utilisateur, ou fiche déjà
  // renseignée) est cherché tel quel, en plus des requêtes par nom : l'utilisateur
  // doit pouvoir le comparer aux autres candidats plutôt que le voir seul.
  const pinnedSiren = normalizeSiren(selectedSiren ?? null) ?? normalizeSiren(company.siren)
  const queries = buildRegistrySearchQueries(account).slice(0, MAX_QUERIES)
  if (pinnedSiren) queries.unshift(pinnedSiren)

  if (queries.length === 0) {
    return NextResponse.json({ candidates: [], recommendedSiren: null })
  }

  try {
    const bySiren = new Map<string, RegistryCandidate>()
    for (const query of queries) {
      for (const candidate of await searchRegistry(query)) {
        if (!bySiren.has(candidate.siren)) bySiren.set(candidate.siren, candidate)
      }
    }

    const ranking = rankIdentityCandidates(account, [...bySiren.values()])
    const candidates = ranking.candidates.slice(0, MAX_CANDIDATES)

    // Le SIREN épinglé reste visible même s'il sort du haut du classement.
    if (pinnedSiren && !candidates.some((c) => c.siren === pinnedSiren)) {
      const pinned = ranking.candidates.find((c) => c.siren === pinnedSiren)
      if (pinned) candidates.push(pinned)
    }

    return NextResponse.json({
      candidates,
      recommendedSiren: ranking.recommendedSiren,
    })
  } catch (error) {
    console.error("[account-identity] API fetch error:", error)
    return NextResponse.json({ candidates: [], recommendedSiren: null })
  }
}
