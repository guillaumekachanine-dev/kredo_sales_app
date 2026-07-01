"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { CommunicationBrief, CommunicationOutput } from "@/lib/n8n/types"

// Type d'interaction — voir la contrainte interactions_type_check (migration 028)
function interactionTypeFor(brief: CommunicationBrief): string {
  if (brief.what.scenario === "profile_submission") return "envoi_cv"
  switch (brief.what.channel) {
    case "linkedin_invitation":
    case "linkedin_message":
      return "linkedin"
    case "internal_note":
      return "note"
    default:
      return "email"
  }
}

export async function saveCommunicationInteraction({
  companyId,
  brief,
  result,
}: {
  companyId: string
  brief: CommunicationBrief
  result: CommunicationOutput
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { error } = await supabase.from("interactions").insert({
    company_id: companyId,
    contact_id: brief.who.recipient.contactId || null,
    author_id: user.id,
    type: interactionTypeFor(brief),
    occurred_at: new Date().toISOString(),
    summary: result.subjects?.[0] || result.body.slice(0, 140),
    details: {
      source: "intel-020-communication",
      scenario: brief.what.scenario,
      channel: brief.what.channel,
      body: result.body,
      subjects: result.subjects,
      key_points: result.key_points,
    },
  })

  if (error) {
    console.error("[intel-020] saveCommunicationInteraction failed:", error)
    return { error: error.message }
  }

  revalidatePath(`/prospection/accounts/${companyId}`)
  return { success: true }
}
