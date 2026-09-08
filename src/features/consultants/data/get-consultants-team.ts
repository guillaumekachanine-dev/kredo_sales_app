import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { CollaborateurRow } from "@/features/consultants/collaborators/collaborators.types"

// ─────────────────────────────────────────────────────────────────────────────
//  Loader de l'effectif consultant — collaborateurs actifs + missions imbriquées.
//
//  Effectif actif = `collaborators.status <> 'sorti'` (C-16). Le contrat de
//  statut « en mission / intercontrat » est lu sur `collaborators.status` côté
//  composant (LEGACY-4), plus sur la présence d'une mission active.
// ─────────────────────────────────────────────────────────────────────────────

export async function getConsultantsTeam(): Promise<CollaborateurRow[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("collaborators")
    .select(`
      id,
      status,
      current_title,
      seniority,
      practice,
      exit_date,
      person:persons ( first_name, last_name, full_name ),
      missions (
        id,
        title,
        status,
        start_date,
        end_date,
        tjm,
        cjm,
        gross_margin_pct,
        company:companies ( name )
      )
    `)
    .neq("status", "sorti")

  return (data ?? []) as CollaborateurRow[]
}
