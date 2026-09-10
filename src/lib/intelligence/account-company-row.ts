import "server-only"

import { cache } from "react"
import { getRequestClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

// ─────────────────────────────────────────────────────────────────────────────
//  Lecture unique de la fiche `companies` d'un compte, pour un rendu.
//
//  Pourquoi : la fiche compte lisait la MÊME ligne trois fois par rendu, depuis
//  trois modules, avec trois listes de colonnes différentes — donc trois URLs
//  distinctes, que la mémoïsation `fetch` de Next ne peut pas dédupliquer.
//  Trace du 2026-09-10 : 34 329 octets (`account-panel-data`) + 35 474 octets
//  (`intelligence-data`, qui embarque le blob `metadata` une seconde fois) puis,
//  une vague plus loin, une requête isolée pour la seule colonne `relation_type`.
//  Voir docs/performance-data-audit, constat F-1a.
//
//  La projection ci-dessous est l'UNION stricte des trois. `account-panel-data`
//  en consomme un sous-ensemble : son propre type reste plus étroit, ce qui est
//  volontaire — le partage porte sur l'aller-retour, pas sur le contrat.
//
//  ⚠️ `cache()` ne mémoïse que pendant un rendu RSC ; les routes API qui
//  appellent ces loaders n'en font qu'un appel chacune et ne perdent rien.
// ─────────────────────────────────────────────────────────────────────────────

export type AccountCompanyRow = {
  id: string
  name: string
  legal_name: string | null
  sector: string | null
  sector_id: string | null
  segment_id: string | null
  segment: string | null
  revenue: string | null
  employee_count: number | null
  size_band: string | null
  priority: string
  lifecycle_status: string
  /** NOT NULL en base. */
  relation_type: string
  website: string | null
  hq_location: string | null
  description: string | null
  metadata: Json
  siren: string | null
  naf_code: string | null
  /** NOT NULL en base, défaut `noted`. */
  depth_level: string
  /** NOT NULL en base, défaut `manual`. */
  origin: string
}

// Littéral d'un seul tenant : PostgREST infère le type de ligne en parsant cette
// chaîne, une concaténation la rendrait opaque.
const ACCOUNT_COMPANY_SELECT =
  "id,name,legal_name,sector,sector_id,segment_id,segment,revenue,employee_count,size_band,priority,lifecycle_status,relation_type,website,hq_location,description,metadata,siren,naf_code,depth_level,origin"

export const getAccountCompanyRow = cache(
  async (companyId: string): Promise<{ data: AccountCompanyRow | null; error: string | null }> => {
    const supabase = await getRequestClient()
    const { data, error } = await supabase
      .from("companies")
      .select(ACCOUNT_COMPANY_SELECT)
      .eq("id", companyId)
      .maybeSingle<AccountCompanyRow>()
    return { data: data ?? null, error: error?.message ?? null }
  },
)
