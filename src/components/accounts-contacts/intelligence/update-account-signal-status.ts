import "server-only"

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type AccountSignalStatus = "dismissed" | "qualified"

export async function updateAccountSignalStatus(
  signalId: string,
  status: AccountSignalStatus,
): Promise<{ companyId: string | null; error: string | null }> {
  if (!signalId.trim()) return { companyId: null, error: "Signal invalide" }

  const sessionClient = await createClient()
  const { data: authData, error: authError } = await sessionClient.auth.getUser()
  if (authError || !authData.user) return { companyId: null, error: "Non authentifié" }

  const { data: profile, error: profileError } = await sessionClient
    .from("profiles")
    .select("workspace_id")
    .eq("id", authData.user.id)
    .maybeSingle()
  if (profileError || !profile?.workspace_id) {
    return { companyId: null, error: "Accès au workspace refusé" }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    return { companyId: null, error: "Configuration Supabase incomplète" }
  }

  // L'écriture service-role compense l'absence de policy UPDATE sur account_signals.
  // L'utilisateur et son workspace sont vérifiés avant l'appel, puis le filtre
  // workspace_id maintient l'isolation tenant sur la mutation exacte.
  const serviceClient = createServiceClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
  const { data: row, error: updateError } = await serviceClient
    .from("account_signals")
    .update({ status })
    .eq("id", signalId)
    .eq("workspace_id", profile.workspace_id)
    .select("company_id")
    .maybeSingle()

  if (updateError) return { companyId: null, error: updateError.message }
  if (!row) return { companyId: null, error: "Signal introuvable" }
  return { companyId: row.company_id, error: null }
}
