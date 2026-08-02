import "server-only"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

// Porte d'entrée unique pour « qui est l'utilisateur courant » et « quel est son
// workspace » côté serveur. `private.current_workspace_id()` vit dans le schéma
// `private`, non exposé PostgREST : la table `profiles` reste l'unique voie
// d'accès depuis le front.
//
// `getClaims()` plutôt que `getUser()` : `getUser()` interroge l'API Auth à
// chaque appel (~170 ms mesurés), `getClaims()` vérifie la signature du JWT en
// local. Vérifié le 2026-08-03 sur un jeton réel de production —
// `{alg:"ES256", kid:"a8d8279d-…"}`, la clé publiée par le JWKS du projet : la
// clé asymétrique est bien ACTIVE, la vérification est donc réellement locale.
// Si le projet revenait à des jetons HS256, `getClaims()` retomberait de
// lui-même sur `getUser()` (@supabase/auth-js, branche `if (!signingKey)`) : on
// perdrait le gain, jamais la justesse. Aucune dégradation de sécurité — la
// fenêtre entre révocation et expiration existe déjà côté RLS, PostgREST
// validant lui aussi le JWT sans consulter l'API Auth.
//
// Les MUTATIONS gardent délibérément `getUser()` : contrôle plus strict, coût
// ponctuel, hors chemin de rendu.
//
// ⚠️ `cache()` ne mémoïse que **pendant un rendu RSC**. En Server Action et en
// route handler il est inerte (React alloue un cache jetable à chaque appel) —
// sans conséquence ici, ces contextes n'appellent le résolveur qu'une fois,
// mais ne pas bâtir de raisonnement sur une déduplication qui n'y a pas lieu.

// Un seul client Supabase pour les deux résolveurs : sans cela, résoudre un
// workspace en construisait deux (chacun avec son GoTrueClient, son
// RealtimeClient et son listener onAuthStateChange) pour la même requête.
const getSharedClient = cache(createClient)

export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await getSharedClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
})

export const resolveCurrentWorkspaceId = cache(async (): Promise<string | null> => {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const supabase = await getSharedClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", userId)
    .single()

  return profile?.workspace_id ?? null
})
