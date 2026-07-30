"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

const VALID_STEPS = new Set([
  "prequalification",
  "entretien_manager",
  "tests_techniques",
  "proposition",
  "signature",
  "integration",
])

export async function updateHiringStep(processId: string, step: string) {
  if (!VALID_STEPS.has(step)) {
    return { error: `Étape invalide : ${step}` }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("candidate_hiring_processes")
    .update({ current_step: step })
    .eq("id", processId)

  if (error) {
    console.error("[recruitment] Failed to update hiring step:", error)
    return { error: error.message }
  }

  revalidatePath("/recruitment")
  return { success: true }
}
