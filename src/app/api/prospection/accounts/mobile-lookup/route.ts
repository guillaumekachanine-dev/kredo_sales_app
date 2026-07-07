import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMobileAccountLookupData } from "@/lib/accounts-contacts/mobile-account-lookup"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  try {
    const accounts = await getMobileAccountLookupData()
    return NextResponse.json({ accounts })
  } catch (error) {
    console.error("[mobile-lookup] failed to load mobile account selector data", error)
    return NextResponse.json({ error: "Impossible de charger les comptes" }, { status: 500 })
  }
}
