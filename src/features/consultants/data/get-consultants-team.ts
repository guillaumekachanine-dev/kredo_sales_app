import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { CollaborateurRow } from "@/components/consultants/synthese/ConsultantsSyntheseDesktop"

// ─────────────────────────────────────────────────────────────────────────────
//  Loader de l'effectif consultant — collaborateurs + missions imbriquées.
//
//  Lot 1 : reprise à l'identique de la requête qui vivait inline dans
//  `src/app/(app)/consultants/page.tsx`. Le contrat de statut « effectif actif »
//  (OPEN QUESTION DATA-1) est traité au Lot 2 ; ce loader ne filtre rien.
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

  return (data ?? []) as CollaborateurRow[]
}
