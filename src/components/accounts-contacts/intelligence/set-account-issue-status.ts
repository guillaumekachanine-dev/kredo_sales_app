"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { AccountIssueStatus } from "@/lib/intelligence/account-intelligence-contracts"

// ADR-0012 Lot 4 / D-4 — curation d'un enjeu matérialisé. Contrairement à la
// curation de account_knowledge (mutation de content_json), account_issues est
// une table normalisée : la curation est une simple mise à jour de `status`
// (open/dismissed/converted), RLS-safe en session utilisateur standard.

export async function setAccountIssueStatus(
  issueId: string,
  status: AccountIssueStatus,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: row, error: updateError } = await supabase
    .from("account_issues")
    .update({ status })
    .eq("id", issueId)
    .select("company_id")
    .maybeSingle()

  if (updateError) return { error: updateError.message }
  if (!row) return { error: "Enjeu introuvable" }

  revalidatePath(`/prospection/accounts/${row.company_id}`)
  return { error: null }
}
