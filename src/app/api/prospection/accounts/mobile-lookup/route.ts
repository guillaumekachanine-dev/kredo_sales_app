import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserId } from "@/lib/supabase/workspace"
import { extractMobilePriorityAccountIdsFromUiPrefs } from "@/lib/accounts-contacts/mobile-account-custom-list"
import { getMobileAccountLookupData } from "@/lib/accounts-contacts/mobile-account-lookup"

export async function GET() {
  const supabase = await createClient()
  // Lecture seule sur un chemin interactif : getClaims() (vérification locale du
  // JWT) plutôt que getUser() et son aller-retour de ~170 ms vers l'API Auth.
  // Les routes d'écriture gardent getUser().
  const userId = await getCurrentUserId()

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  try {
    const [accounts, profileResult] = await Promise.all([
      getMobileAccountLookupData(),
      supabase.from("profiles").select("ui_prefs").eq("id", userId).maybeSingle(),
    ])

    if (profileResult.error) {
      console.error("[mobile-lookup] failed to load profile preferences", profileResult.error)
      return NextResponse.json({ error: "Impossible de charger les comptes" }, { status: 500 })
    }

    return NextResponse.json({
      accounts,
      pinnedIds: extractMobilePriorityAccountIdsFromUiPrefs(profileResult.data?.ui_prefs),
    })
  } catch (error) {
    console.error("[mobile-lookup] failed to load mobile account selector data", error)
    return NextResponse.json({ error: "Impossible de charger les comptes" }, { status: 500 })
  }
}
