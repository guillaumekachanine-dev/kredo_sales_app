import { createClient } from "@/lib/supabase/server"
import type { MatchingContext } from "./types"

// Hydratation via get_matching_context (RPC unique, SECURITY INVOKER, GRANT
// authenticated) plutôt que N requêtes REST. Résolution du workspace_id via
// profiles (private.current_workspace_id() n'est pas exposé PostgREST — même
// contrainte que collect-account-score-input.ts / get-suggested-offers.ts).
export async function collectMatchingInput(opportunityId: string): Promise<MatchingContext> {
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

  const { data, error } = await supabase.rpc("get_matching_context", {
    p_workspace_id: profile.workspace_id,
    p_opportunity_id: opportunityId,
  })

  if (error) {
    throw new Error(`get_matching_context a échoué : ${error.message}`)
  }

  return data as unknown as MatchingContext
}
