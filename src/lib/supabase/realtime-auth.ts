"use client"

// ─── Authentification du canal Realtime ─────────────────────────────────────
// Sans jeton utilisateur, un canal `postgres_changes` se souscrit AVEC SUCCÈS
// (`phx_reply: ok`, « Subscribed to PostgreSQL ») puis ne délivre jamais aucun
// événement : la RLS est évaluée en tant qu'`anon`, qui ne voit aucune ligne.
// Aucune erreur, aucun avertissement — l'écran attend indéfiniment.
//
// Vérifié en direct sur l'application déployée (2026-08-04) : à filtres et
// requête identiques, la souscription porteuse du jeton reçoit les événements,
// celle qui n'en a pas en reçoit zéro.
//
// Le client navigateur finit par poser ce jeton de lui-même quand la session
// est restaurée, mais un canal ouvert avant ce moment reste muet pour toujours
// — il n'est jamais re-souscrit. D'où cette étape explicite avant tout abonnement.

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

export async function ensureRealtimeAuth(supabase: SupabaseClient<Database>): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return
  // Idempotent : reposer le même jeton sur un client déjà authentifié est sans effet.
  await supabase.realtime.setAuth(token)
}
