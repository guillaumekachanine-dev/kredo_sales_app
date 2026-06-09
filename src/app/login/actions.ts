"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signInWithPassword(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const next = (formData.get("next") as string) || "/cockpit"

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "Email ou mot de passe incorrect." }
  }

  redirect(next)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
