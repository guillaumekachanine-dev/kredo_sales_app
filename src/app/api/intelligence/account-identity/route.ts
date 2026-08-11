import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface Candidate {
  siren: string
  name: string
  location: string
  nafCode: string | null
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

  let body: { companyId: string, selectedSiren?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 })
  }

  const { companyId, selectedSiren } = body
  if (!companyId) {
    return NextResponse.json({ error: "companyId requis" }, { status: 400 })
  }

  // Vérifier que la compagnie appartient bien au workspace
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("siren, name, legal_name, hq_location")
    .eq("id", companyId)
    .eq("workspace_id", profile.workspace_id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: "Compagnie introuvable ou accès refusé" }, { status: 404 })
  }

  const sirenToSearch = selectedSiren ?? company.siren
  let query = ""

  if (sirenToSearch) {
    query = sirenToSearch
  } else {
    const name = company.legal_name || company.name
    query = `${name} ${company.hq_location || ""}`.trim()
  }

  if (!query) {
    return NextResponse.json({ candidates: [] })
  }

  try {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&per_page=5`, {
      method: "GET",
      headers: { "Accept": "application/json" }
    })

    if (!res.ok) {
      console.error("[account-identity] API Recherche Entreprise returned", res.status)
      return NextResponse.json({ candidates: [] })
    }

    const json = await res.json()
    const candidates: Candidate[] = (json.results || []).map((r: any) => ({
      siren: r.siren,
      name: r.nom_complet || r.nom_raison_sociale || "",
      location: `${r.siege?.code_postal || ""} ${r.siege?.libelle_commune || ""}`.trim(),
      nafCode: r.activite_principale || null
    }))

    return NextResponse.json({ candidates })
  } catch (error) {
    console.error("[account-identity] API fetch error:", error)
    return NextResponse.json({ candidates: [] })
  }
}
