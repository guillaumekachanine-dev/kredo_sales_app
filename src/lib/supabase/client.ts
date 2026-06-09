// Client Supabase pour le NAVIGATEUR (Client Components).
// Typé via <Database> : toutes les requêtes connaissent tes tables et colonnes.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
