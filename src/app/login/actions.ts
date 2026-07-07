"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

function getSafeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/cockpit"
  }

  return value
}

export async function signInWithPassword(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const next = getSafeNextPath(formData.get("next"))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=invalid_credentials&next=${encodeURIComponent(next)}`)
  }

  redirect(next)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
