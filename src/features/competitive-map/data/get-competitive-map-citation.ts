"use server"

import "server-only"

// ADR-0019 Lot 6 — lecture de l'analyse cartographique et des faits sourcés
// d'un compte `mapped`, pour le drawer minimal (CompanyIdentityDrawerMappedView).
// `v_crm_account_list` n'expose pas `competitive_map_entries` (D-4 : l'analyse
// cartographique ne touche jamais les colonnes canoniques de `companies`) —
// lecture directe des deux tables sourcées par l'ingestion (migration 074).

import { createClient } from "@/lib/supabase/server"
import { COMPETITIVE_MAP_CATEGORY_LABELS, type CompetitiveMapCategory } from "../domain/competitive-map-output"

export type CompetitiveMapEntrySnapshot = {
  /** Valeur brute de `competitive_map_entries.category` — pas forcément dans le domaine si la ligne a été écrite hors du pipeline d'ingestion. */
  category: string
  categoryLabel: string
  positioning: string | null
  forces: string | null
  vulnerabilite: string | null
  angleEntree: string | null
  empreinteMetier: number | null
  maturiteNumerique: number | null
  appetenceScore: number | null
  appetenceProvisoire: boolean
  confiance: string
  studySnapshotDate: string
  profileJson: Record<string, unknown> | null
}

export type CompetitiveMapAccountFacts = {
  revenueEstimateMeur: number | null
  revenueExercice: number | null
  revenuePerimetre: string | null
  headcountFrance: string | null
}

export type CompetitiveMapCitation = {
  entry: CompetitiveMapEntrySnapshot | null
  facts: CompetitiveMapAccountFacts
}

type RevenueEstimateJson = { amountMeur?: number | null; exercice?: number | null; perimetre?: string | null }

function isCompetitiveMapCategory(value: string): value is CompetitiveMapCategory {
  return value in COMPETITIVE_MAP_CATEGORY_LABELS
}

export async function getCompetitiveMapCitation(companyId: string): Promise<CompetitiveMapCitation> {
  const supabase = await createClient()

  const [entryResult, factsResult] = await Promise.all([
    supabase
      .from("competitive_map_entries")
      .select(
        "category, positioning, forces, vulnerabilite, angle_entree, empreinte_metier, maturite_numerique, appetence_score, appetence_provisoire, confiance, study_snapshot_date, profile_json"
      )
      .eq("company_id", companyId)
      .order("study_snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("account_facts")
      .select("fact_type, value_json, value_text")
      .eq("target_type", "company")
      .eq("target_id", companyId)
      .eq("is_current", true)
      .in("fact_type", ["revenue_estimate", "headcount_france"]),
  ])

  const entryRow = entryResult.data
  const entry: CompetitiveMapEntrySnapshot | null = entryRow
    ? {
        category: entryRow.category,
        categoryLabel: isCompetitiveMapCategory(entryRow.category)
          ? COMPETITIVE_MAP_CATEGORY_LABELS[entryRow.category]
          : entryRow.category,
        positioning: entryRow.positioning,
        forces: entryRow.forces,
        vulnerabilite: entryRow.vulnerabilite,
        angleEntree: entryRow.angle_entree,
        empreinteMetier: entryRow.empreinte_metier,
        maturiteNumerique: entryRow.maturite_numerique,
        appetenceScore: entryRow.appetence_score,
        appetenceProvisoire: entryRow.appetence_provisoire,
        confiance: entryRow.confiance,
        studySnapshotDate: entryRow.study_snapshot_date,
        profileJson: (entryRow.profile_json as Record<string, unknown> | null) ?? null,
      }
    : null

  const facts = factsResult.data ?? []
  const revenueRow = facts.find((row) => row.fact_type === "revenue_estimate")
  const headcountRow = facts.find((row) => row.fact_type === "headcount_france")
  const revenueJson = (revenueRow?.value_json ?? null) as RevenueEstimateJson | null

  return {
    entry,
    facts: {
      revenueEstimateMeur: revenueJson?.amountMeur ?? null,
      revenueExercice: revenueJson?.exercice ?? null,
      revenuePerimetre: revenueJson?.perimetre ?? null,
      headcountFrance: headcountRow?.value_text ?? null,
    },
  }
}
