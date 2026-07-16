import "server-only"

import { createClient } from "@/lib/supabase/server"

// Résout le workspace_id de l'utilisateur courant depuis sa session. Reprend
// l'idiome déjà utilisé (en inline) dans get-suggested-offers.ts, collect-account-
// score-input.ts, collect-matching-input.ts : private.current_workspace_id() vit
// dans le schéma `private`, non exposé PostgREST, donc jamais appelable en RPC
// depuis le front — la table profiles reste l'unique voie d'accès côté client.
export async function resolveCurrentWorkspaceId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  return profile?.workspace_id ?? null
}
