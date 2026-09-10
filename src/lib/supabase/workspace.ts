import "server-only"

import { cache } from "react"
import { getRequestClient } from "@/lib/supabase/server"

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

// Un seul client Supabase pour tous les résolveurs ET tous les loaders du rendu :
// `getRequestClient` est le `cache(createClient)` exporté par `server.ts`. Sans ce
// partage, chaque module construit son propre GoTrueClient — donc son propre cache
// JWKS — et `getClaims()` repaie un aller-retour réseau complet (77-184 ms mesurés
// le 2026-09-10, contre 0,4-1,0 ms sur client partagé).

export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await getRequestClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
})

export type CurrentProfile = {
  workspaceId: string
  /** `owner` · `admin` · `sales` · `recruiter` · `viewer` */
  role: string | null
}

// Une seule lecture de `profiles` par rendu, pour TOUS les besoins d'identité.
// `role` est remonté ici plutôt que relu séparément : les consommateurs qui gèrent
// une capacité réservée aux admins (gestion des sources, rémunération) ajoutaient
// sinon une seconde requête `select("workspace_id, role")`, distincte de celle-ci
// et donc non dédupliquée par la mémoïsation `fetch` de Next.
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const supabase = await getRequestClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, role")
    .eq("id", userId)
    .single()

  if (!profile?.workspace_id) return null
  return { workspaceId: profile.workspace_id, role: profile.role ?? null }
})

export const resolveCurrentWorkspaceId = cache(async (): Promise<string | null> => {
  return (await getCurrentProfile())?.workspaceId ?? null
})
