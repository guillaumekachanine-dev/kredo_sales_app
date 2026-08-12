"use server"

import "server-only"

// ADR-0019 Lot 5 — écriture de la cartographie déjà arbitrée par l'utilisateur
// (étape 3 du wizard, après le bac d'arbitrage de l'étape 2). Même doctrine
// que `applyAccountClassification`/`applyAccountScanProposals` : le navigateur
// n'envoie que des décisions déjà vues et validées côté client, jamais une
// valeur canonique "en confiance" ; toute la logique d'écriture (résolution du
// segment, garde-fous, upserts) vit dans la RPC `ingest_competitive_map_batch`
// (SECURITY DEFINER, migration 074).

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  COMPETITIVE_MAP_CATEGORY_VALUES,
  COMPETITIVE_MAP_CONFIANCE_VALUES,
  type CompetitiveMapCategory,
  type CompetitiveMapConfiance,
  type CompetitiveMapProfile,
} from "../domain/competitive-map-output"

export type CompetitiveMapIngestionDecision = {
  action: "attach" | "create"
  companyId: string | null
  name: string | null
  siren: string | null
  segmentSlug: string
  category: CompetitiveMapCategory
  positioning: string | null
  forces: string | null
  vulnerabilite: string | null
  angleEntree: string | null
  empreinteMetier: number | null
  maturiteNumerique: number | null
  appetenceScore: number | null
  /** Composante « accessibilité » (1-5), axe Y de la matrice. `null` = non renseigné, jamais substitué. */
  accessibiliteScore: number | null
  appetenceProvisoire: boolean
  /** `meta.compte_etalon` de l'étude -> `competitive_map_entries.is_benchmark_account`. */
  isBenchmarkAccount: boolean
  /** Narratif d'étude projeté dans `profile_json`. Jamais de fait chiffré sourcé ici (ADR-0019 D-4). */
  profileJson: CompetitiveMapProfile
  confiance: CompetitiveMapConfiance
  studySnapshotDate: string
  caMeur: number | null
  exercice: number | null
  perimetreCa: string | null
  effectifFrance: number | null
}

export type ConfirmCompetitiveMapIngestionResult = {
  error: string | null
  created: { companyId: string; name: string }[]
  attached: { companyId: string }[]
  errors: { name: string | null; code: string; sqlstate: string }[]
}

const EMPTY: ConfirmCompetitiveMapIngestionResult = { error: null, created: [], attached: [], errors: [] }

function isNullableIntegerInRange(value: number | null, min: number, max: number): boolean {
  if (value === null) return true
  return Number.isInteger(value) && value >= min && value <= max
}

function isPlainObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidDecision(decision: CompetitiveMapIngestionDecision): string | null {
  if (decision.action !== "attach" && decision.action !== "create") return "action invalide"
  if (decision.action === "attach" && !decision.companyId) return "companyId requis pour un rattachement"
  if (decision.action === "create" && !decision.name?.trim()) return "nom requis pour une création"
  if (!decision.segmentSlug) return "segment requis"
  if (!(COMPETITIVE_MAP_CATEGORY_VALUES as readonly string[]).includes(decision.category)) return "catégorie invalide"
  if (!(COMPETITIVE_MAP_CONFIANCE_VALUES as readonly string[]).includes(decision.confiance)) return "confiance invalide"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(decision.studySnapshotDate)) return "date d'étude invalide"
  // Mêmes bornes que les CHECK de competitive_map_entries : une valeur hors
  // domaine est rejetée ici plutôt que d'aller échouer entrée par entrée dans
  // la RPC, où elle ne remonterait qu'en ligne d'erreur du bilan.
  if (!isNullableIntegerInRange(decision.accessibiliteScore, 1, 5)) return "accessibilité hors bornes (1-5)"
  if (!isNullableIntegerInRange(decision.appetenceScore, 0, 35)) return "score d'appétence hors bornes (0-35)"
  if (!isPlainObject(decision.profileJson)) return "profil d'étude invalide (objet attendu)"
  return null
}

export async function confirmCompetitiveMapIngestion(
  decisions: CompetitiveMapIngestionDecision[],
  reason?: string,
): Promise<ConfirmCompetitiveMapIngestionResult> {
  if (decisions.length === 0) {
    return { ...EMPTY, error: "Aucune décision à appliquer." }
  }

  for (const decision of decisions) {
    const validationError = isValidDecision(decision)
    if (validationError) {
      return { ...EMPTY, error: `Décision invalide (${decision.name ?? decision.companyId ?? "?"}) : ${validationError}` }
    }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ...EMPTY, error: "Non authentifié" }
  }

  const { data, error } = await supabase.rpc("ingest_competitive_map_batch", {
    p_decisions: decisions,
    ...(reason ? { p_reason: reason } : {}),
  })

  if (error) {
    return { ...EMPTY, error: error.details || error.message }
  }

  const payload = (data ?? {}) as {
    created?: { companyId: string; name: string }[]
    attached?: { companyId: string }[]
    errors?: { name: string | null; code: string; sqlstate: string }[]
  }

  revalidatePath("/prospection/accounts")

  return {
    error: null,
    created: payload.created ?? [],
    attached: payload.attached ?? [],
    errors: payload.errors ?? [],
  }
}
