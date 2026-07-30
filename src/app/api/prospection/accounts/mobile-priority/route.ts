import "server-only"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  extractCrmLauncherAccountIdsFromUiPrefs,
  mergeCrmLauncherAccountIdsIntoUiPrefs,
  sanitizeCrmLauncherAccountIds,
} from "@/lib/crm/account-launcher-preferences"

async function requireAuthenticatedProfile() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      errorResponse: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
      supabase,
      userId: null,
    }
  }

  return {
    errorResponse: null,
    supabase,
    userId: user.id,
  }
}

export async function GET() {
  const { errorResponse, supabase, userId } = await requireAuthenticatedProfile()
  if (errorResponse) return errorResponse
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("ui_prefs")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("[mobile-priority] failed to load profile preferences", error)
    return NextResponse.json({ error: "Impossible de charger la liste personnalisée" }, { status: 500 })
  }

  return NextResponse.json({
    pinnedIds: extractCrmLauncherAccountIdsFromUiPrefs(profile?.ui_prefs),
  })
}

export async function PUT(request: Request) {
  const { errorResponse, supabase, userId } = await requireAuthenticatedProfile()
  if (errorResponse) return errorResponse
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  let body: { pinnedIds?: unknown }
  try {
    body = (await request.json()) as { pinnedIds?: unknown }
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  }

  const nextPinnedIds = sanitizeCrmLauncherAccountIds(body.pinnedIds)

  const { data: currentProfile, error: readError } = await supabase
    .from("profiles")
    .select("ui_prefs")
    .eq("id", userId)
    .maybeSingle()

  if (readError) {
    console.error("[mobile-priority] failed to read current profile preferences", readError)
    return NextResponse.json({ error: "Impossible d'enregistrer la liste personnalisée" }, { status: 500 })
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from("profiles")
    .update({
      ui_prefs: mergeCrmLauncherAccountIdsIntoUiPrefs(currentProfile?.ui_prefs, nextPinnedIds),
    })
    .eq("id", userId)
    .select("ui_prefs")
    .maybeSingle()

  if (updateError) {
    console.error("[mobile-priority] failed to persist profile preferences", updateError)
    return NextResponse.json({ error: "Impossible d'enregistrer la liste personnalisée" }, { status: 500 })
  }

  return NextResponse.json({
    pinnedIds: extractCrmLauncherAccountIdsFromUiPrefs(updatedProfile?.ui_prefs),
  })
}
