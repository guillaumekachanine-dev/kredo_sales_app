"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import type { AccountKnowledgeContent, AccountKnowledgeFact } from "@/lib/intelligence/account-intelligence-contracts"

// ADR-0012 Lot 2 / D-4 — curation humaine des faits de "Connaissance compte".
// Mutation directe de `content_json` (RLS standard, pas de service_role requis :
// la policy UPDATE de ai_intelligence_results est déjà scopée workspace). On ne
// réécrit jamais ce que le modèle a dit : `dismissed` masque sans supprimer,
// `confirm` fait passer la provenance en `human_verified` (D-3) sans effacer
// la source d'origine si elle était renseignée.

export type AccountKnowledgeFactSection =
  | "identity_positioning"
  | "commercial_relationship"
  | "organisation_observed"
  | "frictions_and_signals"
  | "open_questions"

export type AccountKnowledgeCurationAction = "confirm" | "dismiss" | "restore" | "pin" | "unpin"

export async function curateAccountKnowledgeFact(
  resultId: string,
  section: AccountKnowledgeFactSection,
  factIndex: number,
  action: AccountKnowledgeCurationAction,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: row, error: fetchError } = await supabase
    .from("ai_intelligence_results")
    .select("id, company_id, content_json")
    .eq("id", resultId)
    .maybeSingle()

  if (fetchError) return { error: fetchError.message }
  if (!row) return { error: "Résultat introuvable" }

  const content = row.content_json as unknown as AccountKnowledgeContent
  const facts = content?.[section]
  if (!Array.isArray(facts) || !facts[factIndex]) return { error: "Fait introuvable" }

  const fact: AccountKnowledgeFact = { ...facts[factIndex] }
  switch (action) {
    case "confirm":
      fact.provenance = "human_verified"
      fact.dismissed = false
      break
    case "dismiss":
      fact.dismissed = true
      break
    case "restore":
      fact.dismissed = false
      break
    case "pin":
      fact.pinned = true
      break
    case "unpin":
      fact.pinned = false
      break
  }

  const nextFacts = [...facts]
  nextFacts[factIndex] = fact
  const nextContent: AccountKnowledgeContent = { ...content, [section]: nextFacts }

  const { error: updateError } = await supabase
    .from("ai_intelligence_results")
    .update({ content_json: nextContent as unknown as Json })
    .eq("id", resultId)

  if (updateError) return { error: updateError.message }

  if (row.company_id) revalidatePath(`/prospection/accounts/${row.company_id}`)
  return { error: null }
}
