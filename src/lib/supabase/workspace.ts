import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

// Résout le workspace_id de l'utilisateur courant depuis sa session. Reprend
// l'idiome déjà utilisé (en inline) dans get-suggested-offers.ts, collect-account-
// score-input.ts, collect-matching-input.ts : private.current_workspace_id() vit
// dans le schéma `private`, non exposé PostgREST, donc jamais appelable en RPC
// depuis le front — la table profiles reste l'unique voie d'accès côté client.
//
// ── Deux optimisations, toutes deux déjà éprouvées ailleurs dans le projet ──
//
// 1. `getClaims()` au lieu de `getUser()`. `getUser()` interroge l'API Auth
//    Supabase à CHAQUE appel — aller-retour réseau mesuré à ~170 ms depuis un
//    poste de dev, payé sur le chemin critique du rendu. `getClaims()` vérifie
//    la signature du JWT localement, exactement le même arbitrage que celui
//    déjà appliqué et documenté dans src/proxy.ts.
//    ✅ Vérifié le 2026-08-03 sur un jeton réel de production : en-tête
//    `{alg:"ES256", kid:"a8d8279d-d0da-475d-8b88-a9ebf95d9669"}` — soit
//    exactement la clé publiée par le JWKS du projet. La clé asymétrique est
//    donc bien la clé ACTIVE (et non une clé en standby) : la vérification est
//    réellement locale, l'aller-retour est réellement supprimé.
//    À savoir si la question se repose un jour : en cas de retour à des jetons
//    HS256, `getClaims()` retombe de lui-même sur `getUser()` (lu dans
//    @supabase/auth-js, branche `if (!signingKey)`) — on perdrait le gain, mais
//    jamais la justesse.
//    Pas de dégradation de sécurité : la fenêtre entre révocation et expiration
//    du jeton existe déjà côté RLS, puisque PostgREST valide lui aussi le JWT
//    sans consulter l'API Auth. On ne l'élargit pas, on cesse juste de payer un
//    aller-retour pour une information que le jeton porte déjà.
//    Les MUTATIONS (Server Actions, routes d'écriture) gardent volontairement
//    `getUser()` : contrôle plus strict, coût ponctuel, hors chemin de rendu.
//
// 2. `cache()` de React mémoïse le résultat pour la DURÉE D'UNE REQUÊTE serveur
//    (jamais entre deux utilisateurs, jamais entre deux requêtes : ce n'est pas
//    un cache de données, c'est une déduplication de requête). Deux loaders
//    appelés en parallèle dans le même rendu ne résolvent donc plus le workspace
//    deux fois. Même primitive que getDashboardDevice().
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
})

export const resolveCurrentWorkspaceId = cache(async (): Promise<string | null> => {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", userId)
    .single()

  return profile?.workspace_id ?? null
})
