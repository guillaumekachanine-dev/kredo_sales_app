// Client Supabase pour le SERVEUR (Server Components, Route Handlers).
// Typé via <Database>. En Next.js 15, cookies() est asynchrone.
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { createTracingFetch } from "./perf-trace";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Diagnostic uniquement — `undefined` hors KREDO_PERF_TRACE=1 (cf. perf-trace.ts).
      global: { fetch: createTracingFetch() },
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

// Client Supabase partagé pour la durée d'un rendu RSC.
//
// Pourquoi : `createClient()` construit un client neuf — donc un GoTrueClient neuf,
// **avec son propre cache JWKS**. Mesuré le 2026-09-10 : `auth.getClaims()` coûte
// 0,4–1,0 ms sur un client partagé, mais 77–184 ms sur un client neuf, parce qu'il
// retélécharge le JWKS à chaque fois. Les journaux Supabase montraient 427 appels
// quotidiens à `/auth/v1/.well-known/jwks.json` pour cette raison.
// Voir docs/performance-data-audit/04-FINDINGS-AND-PRIORITIES.md#f-4.
//
// ⚠️ `cache()` ne mémoïse que **pendant un rendu RSC**. En Server Action et en route
// handler il est inerte (React alloue un cache jetable à chaque appel) : ces contextes
// gardent délibérément `createClient()` et `getUser()` — contrôle plus strict, coût
// ponctuel, hors chemin de rendu.
export const getRequestClient = cache(createClient);
