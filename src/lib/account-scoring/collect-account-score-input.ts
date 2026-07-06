import { createClient } from "@/lib/supabase/server"
import type { AccountScoreContext } from "./types"

// ADR-0011 Lot 3 — hydratation via get_account_score_context (RPC unique,
// SECURITY INVOKER, GRANT authenticated) plutôt que N requêtes REST séparées.
// Résolution du workspace_id via profiles, pas via private.current_workspace_id()
// (schéma private, non exposé PostgREST — même contrainte que get-suggested-offers.ts, ADR-0009).
export async function collectAccountScoreInput(companyId: string): Promise<AccountScoreContext> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error("Non authentifié")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.workspace_id) {
    throw new Error("Workspace introuvable pour l'utilisateur courant")
  }

  const { data, error } = await supabase.rpc("get_account_score_context", {
    p_workspace_id: profile.workspace_id,
    p_company_id: companyId,
  })

  if (error) {
    throw new Error(`get_account_score_context a échoué : ${error.message}`)
  }

  return data as unknown as AccountScoreContext
}
