"use server"

import "server-only"

// ADR-0019 Lot 5 — résolution en lecture seule des comptes d'une cartographie
// concurrentielle contre les comptes déjà en base. Aucune écriture ici : le
// bac d'arbitrage (étape 2 du wizard) affiche ce résultat avant que
// l'utilisateur ne confirme quoi que ce soit via `confirmCompetitiveMapIngestion`.

import { createClient } from "@/lib/supabase/server"
import {
  classifyCompetitiveMapResolution,
  type CompetitiveMapCandidate,
  type CompetitiveMapResolutionStatus,
} from "../domain/resolve-competitive-map-account"
import type { CompetitiveMapAccountInput } from "../domain/competitive-map-output"

export type CompetitiveMapEntryPreview = {
  index: number
  input: CompetitiveMapAccountInput
  status: CompetitiveMapResolutionStatus
  candidates: CompetitiveMapCandidate[]
}

const SIREN_FORMAT = /^\d{9}$/

export async function resolveCompetitiveMapEntries(
  comptes: CompetitiveMapAccountInput[],
): Promise<{ error: string | null; entries: CompetitiveMapEntryPreview[] }> {
  if (comptes.length === 0) {
    return { error: "Aucun compte à résoudre.", entries: [] }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Non authentifié", entries: [] }
  }

  const entries = await Promise.all(
    comptes.map(async (input, index): Promise<CompetitiveMapEntryPreview> => {
      const siren = input.identifiantNational && SIREN_FORMAT.test(input.identifiantNational)
        ? input.identifiantNational
        : null

      const { data, error } = await supabase.rpc("resolve_company_candidates", {
        p_name: input.nom,
        ...(siren ? { p_siren: siren } : {}),
      })

      const candidates: CompetitiveMapCandidate[] = error
        ? []
        : (data ?? []).map((row) => ({
            companyId: row.company_id,
            name: row.name,
            siren: row.siren,
            matchMethod: row.match_method as CompetitiveMapCandidate["matchMethod"],
            matchScore: row.match_score ?? 0,
          }))

      return {
        index,
        input,
        status: classifyCompetitiveMapResolution(candidates),
        candidates,
      }
    }),
  )

  return { error: null, entries }
}
