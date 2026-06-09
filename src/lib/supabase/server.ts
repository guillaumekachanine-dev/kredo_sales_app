// Client Supabase pour le SERVEUR (Server Components, Route Handlers).
// Typé via <Database>. En Next.js 15, cookies() est asynchrone.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Peut échouer dans un Server Component pur : sans danger si un
          // middleware rafraîchit la session (cas standard).
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* no-op */
          }
        },
      },
    }
  );
}
