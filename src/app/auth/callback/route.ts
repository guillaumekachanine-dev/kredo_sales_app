import "server-only"

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Callback OAuth / Magic Link Supabase.
 * Échange le code d'autorisation contre une session côté serveur.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/cockpit"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Erreur ou pas de code → retour login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
