"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { isAccountDepthLevel, isPromotion, type AccountDepthLevel } from "../domain/depth-level"

export type PromoteAccountDepthResult = {
  error: string | null
  promoted: boolean
}

/**
 * Point d'écriture UNIQUE de `companies.depth_level` (ADR-0019 D-2). Toute
 * transition de profondeur — qualification après scan, conversion d'un compte
 * cartographié, avancée dans la chaîne de décision ADR-0012 — doit passer par
 * cette action, jamais par un `update` direct depuis un autre module.
 *
 * Idempotente et sûre à appeler en aveugle : une cible égale ou inférieure au
 * palier courant est un no-op silencieux (D-1, jamais de démotion automatique).
 */
export async function promoteAccountDepth(
  companyId: string,
  target: AccountDepthLevel
): Promise<PromoteAccountDepthResult> {
  if (!companyId) return { error: "Identifiant de compte manquant.", promoted: false }
  if (!isAccountDepthLevel(target)) {
    return { error: `Palier de profondeur invalide : ${target}`, promoted: false }
  }

  const supabase = await createClient()

  const { data: current, error: readError } = await supabase
    .from("companies")
    .select("depth_level")
    .eq("id", companyId)
    .maybeSingle()

  if (readError) return { error: readError.message, promoted: false }
  if (!current) return { error: "Compte introuvable.", promoted: false }

  const currentLevel = current.depth_level as AccountDepthLevel
  if (!isPromotion(currentLevel, target)) {
    return { error: null, promoted: false }
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update({ depth_level: target })
    .eq("id", companyId)

  if (updateError) return { error: updateError.message, promoted: false }

  revalidatePath("/prospection/accounts")
  revalidatePath(`/prospection/accounts/${companyId}`)

  return { error: null, promoted: true }
}
