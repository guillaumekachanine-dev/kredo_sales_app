"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

const VALID_STATUSES = new Set([
  "nouveau",
  "qualifie",
  "vivier",
  "propose",
  "en_process",
  "recrute",
  "refuse",
  "indisponible",
  "archive",
  "ko_manager",
])

export async function updateCandidateStatus(candidateId: string, status: string) {
  if (!VALID_STATUSES.has(status)) {
    return { error: `Statut invalide : ${status}` }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("candidates")
    .update({ status })
    .eq("id", candidateId)

  if (error) {
    console.error("[recruitment] Failed to update candidate status:", error)
    return { error: error.message }
  }

  revalidatePath("/recruitment")
  return { success: true }
}
