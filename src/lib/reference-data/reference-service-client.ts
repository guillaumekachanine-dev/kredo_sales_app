import "server-only"

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Client service-role dédié aux lectures de référentiels mises en cache
// (reference-cache.ts). Ces lectures tournent dans unstable_cache — donc hors
// scope requête, sans cookies de session — la RLS ne peut plus s'appliquer.
// Isolation garantie exclusivement par le filtre .eq("workspace_id", …) posé
// explicitement dans chaque get-*-catalog.ts. Ne jamais interroger ce client
// sans ce filtre. Pattern repris de createReportsServiceClient (reports-actions.ts).
export async function createReferenceServiceClient(): Promise<SupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Variables Supabase service-role manquantes")
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}
