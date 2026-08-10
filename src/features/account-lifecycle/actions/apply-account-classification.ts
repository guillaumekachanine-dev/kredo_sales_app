"use server"

import "server-only"

// ADR-0019 Lot 4 — application des 7 axes de classification issus d'un scan.
//
// Même doctrine que `applyAccountScanProposals` : le navigateur ne transmet
// JAMAIS une valeur à écrire. Il envoie l'id du résultat de scan et la liste des
// axes acceptés ; la RPC `apply_account_classification` (SECURITY DEFINER)
// relit le contenu depuis `ai_intelligence_results.content_json` et applique les
// contrôles §10 du REFERENTIEL-CLASSIFICATION avant écriture.
//
// Cette action ajoute la vérification compte/résultat que la RPC ne fait pas :
// la RPC ne connaît que le workspace, elle ne sait pas quel compte l'utilisateur
// a effectivement sous les yeux.

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { isClassificationAxis, type ClassificationAxis } from "../domain/account-classification"

export type ApplyAccountClassificationResult = {
  error: string | null
  appliedAxes: ClassificationAxis[]
  /** Axes refusés par la base avec leur motif — typiquement le garde-fou §12.9. */
  skippedAxes: { axis: string; reason: string }[]
}

const EMPTY: ApplyAccountClassificationResult = { error: null, appliedAxes: [], skippedAxes: [] }

export async function applyAccountClassification(input: {
  resultId: string
  companyId: string
  acceptedAxes: ClassificationAxis[]
}): Promise<ApplyAccountClassificationResult> {
  const { resultId, companyId, acceptedAxes } = input

  if (!resultId || !companyId) {
    return { ...EMPTY, error: "Paramètres invalides" }
  }

  const axes = Array.from(new Set(acceptedAxes)).filter(isClassificationAxis)
  if (axes.length === 0) {
    return { ...EMPTY, error: "Aucun axe de classification retenu." }
  }

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ...EMPTY, error: "Non authentifié" }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.workspace_id) {
    return { ...EMPTY, error: "Workspace introuvable pour l'utilisateur courant" }
  }

  // Le résultat doit appartenir au compte affiché : sans ce contrôle, un
  // resultId d'un autre compte du même workspace passerait la RPC.
  const { data: result, error: resultError } = await supabase
    .from("ai_intelligence_results")
    .select("id, workspace_id, company_id, result_type, status")
    .eq("id", resultId)
    .maybeSingle()

  if (resultError || !result) {
    return { ...EMPTY, error: "Résultat de scan introuvable" }
  }

  if (
    result.workspace_id !== profile.workspace_id ||
    result.company_id !== companyId ||
    result.result_type !== "account_scan" ||
    result.status !== "succeeded"
  ) {
    return { ...EMPTY, error: "Ce résultat n'appartient pas au compte courant ou n'est pas applicable." }
  }

  const { data, error } = await supabase.rpc("apply_account_classification", {
    p_result_id: resultId,
    p_accepted_axes: axes,
  })

  if (error) {
    // Les contrôles §10 remontent en `message` (code court) + `detail` (phrase
    // lisible). PostgREST expose le detail dans `error.details` : le préférer
    // au code, qui ne dit rien à l'utilisateur.
    return { ...EMPTY, error: error.details || error.message }
  }

  const payload = (data ?? {}) as {
    appliedAxes?: string[]
    skippedAxes?: { axis: string; reason: string }[]
  }

  revalidatePath(`/prospection/accounts/${companyId}`)
  revalidatePath("/prospection/accounts")

  return {
    error: null,
    appliedAxes: (payload.appliedAxes ?? []).filter(isClassificationAxis),
    skippedAxes: payload.skippedAxes ?? [],
  }
}
