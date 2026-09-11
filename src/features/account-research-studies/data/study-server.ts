import "server-only"

// ─── Accès serveur communs aux études ───────────────────────────────────────
// Deux clients, deux usages :
//   - client UTILISATEUR (RLS) pour toute lecture ou écriture déclenchée par un clic —
//     la frontière workspace est appliquée par la base ;
//   - client SERVICE-ROLE pour le stockage (URL d'upload signée, lecture du PDF) et le
//     chemin callback n8n, qui n'a pas de session. Il n'est appelé qu'APRÈS un contrôle
//     d'authentification et d'appartenance, jamais depuis le navigateur.

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export type StudyServiceClient = ReturnType<typeof createSupabaseClient<Database>>
export type StudyUserClient = Awaited<ReturnType<typeof createClient>>

export type StudyRow = Database["public"]["Tables"]["account_research_studies"]["Row"]

export function getStudyServiceClient(): StudyServiceClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Variables Supabase service-role manquantes")
  return createSupabaseClient<Database>(url, key)
}

export type StudyActor = { supabase: StudyUserClient; userId: string; workspaceId: string }

export async function requireStudyActor(): Promise<StudyActor> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Non authentifié")

  const { data: profile } = await supabase.from("profiles").select("workspace_id").eq("id", user.id).single()
  if (!profile?.workspace_id) throw new Error("Workspace introuvable pour l'utilisateur courant")
  return { supabase, userId: user.id, workspaceId: profile.workspace_id }
}

export type StudyCompany = {
  id: string
  name: string
  workspaceId: string
  segmentSlug: string | null
  segmentName: string | null
}

type CompanyRow = {
  id: string
  name: string
  workspace_id: string
  segment: { slug: string; name: string } | null
}

/**
 * Lit le compte et son segment. Avec le client utilisateur, une ligne absente signifie
 * « hors de votre workspace » : l'appelant refuse l'opération.
 */
export async function loadStudyCompany(
  client: StudyUserClient | StudyServiceClient,
  companyId: string,
): Promise<StudyCompany | null> {
  const { data } = await client
    .from("companies")
    .select("id,name,workspace_id,segment:sector_intelligence!companies_segment_id_fkey(slug,name)")
    .eq("id", companyId)
    .maybeSingle<CompanyRow>()
  if (!data) return null
  return {
    id: data.id,
    name: data.name,
    workspaceId: data.workspace_id,
    segmentSlug: data.segment?.slug ?? null,
    segmentName: data.segment?.name ?? null,
  }
}
