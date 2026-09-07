"use server"

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Json } from "@/types/database"
import {
  MISSION_CONTACT_ROLES,
  type MissionContactRole,
} from "@/components/missions/engagements/mission-contact-constants"

export interface MissionContactEntry {
  contact_id: string
  role: string
}

function parseMissionContacts(metadata: Json): MissionContactEntry[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return []
  const val = (metadata as Record<string, unknown>).mission_contacts
  if (!Array.isArray(val)) return []
  return val.filter(
    (item): item is MissionContactEntry =>
      Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).contact_id === "string")
  )
}

function parseContactIds(metadata: Json): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return []
  const val = (metadata as Record<string, unknown>).contact_ids
  if (!Array.isArray(val)) return []
  return val.filter((v): v is string => typeof v === "string")
}

export async function addMissionContact({
  missionId,
  contactId,
  role,
}: {
  missionId: string
  contactId: string
  role: MissionContactRole | string
}): Promise<{ success?: boolean; error?: string }> {
  if (!missionId || !contactId || !role) {
    return { error: "Paramètres manquants pour associer le contact." }
  }

  if (!MISSION_CONTACT_ROLES.includes(role as MissionContactRole)) {
    return { error: "Rôle de mission invalide." }
  }

  try {
    const supabase = await createClient()

    const { data: mission, error: fetchError } = await supabase
      .from("missions")
      .select("id, metadata, opportunity_id")
      .eq("id", missionId)
      .maybeSingle()

    if (fetchError || !mission) {
      return { error: `Mission introuvable : ${fetchError?.message || ""}` }
    }

    const currentMeta = (mission.metadata || {}) as Record<string, unknown>
    const existingList = parseMissionContacts(mission.metadata)

    // Si mission_contacts est encore vide, initialiser depuis contact_ids ou opportunity_contacts
    let baseList = [...existingList]
    if (baseList.length === 0) {
      const existingIds = parseContactIds(mission.metadata)
      if (existingIds.length > 0) {
        baseList = existingIds.map((id) => ({
          contact_id: id,
          role: "Manager opérationnel",
        }))
      } else if (mission.opportunity_id) {
        const { data: oppContacts } = await supabase
          .from("opportunity_contacts")
          .select("contact_id, role")
          .eq("opportunity_id", mission.opportunity_id)
        if (oppContacts && oppContacts.length > 0) {
          baseList = oppContacts.map((oc) => ({
            contact_id: oc.contact_id,
            role: oc.role || "Manager opérationnel",
          }))
        }
      }
    }

    // Mettre à jour ou ajouter le contact
    const existingIdx = baseList.findIndex((item) => item.contact_id === contactId)
    if (existingIdx >= 0) {
      baseList[existingIdx] = { contact_id: contactId, role }
    } else {
      baseList.push({ contact_id: contactId, role })
    }

    const contactIds = Array.from(new Set(baseList.map((item) => item.contact_id)))

    const updatedMetadata = {
      ...currentMeta,
      mission_contacts: baseList,
      contact_ids: contactIds,
    }

    const { error: updateError } = await supabase
      .from("missions")
      .update({ metadata: updatedMetadata as unknown as Json })
      .eq("id", missionId)

    if (updateError) {
      return { error: `Erreur d'enregistrement : ${updateError.message}` }
    }

    revalidatePath("/missions")
    return { success: true }
  } catch (err) {
    console.error("[addMissionContact] unhandled", err)
    return { error: "Une erreur inattendue est survenue." }
  }
}

export async function removeMissionContact({
  missionId,
  contactId,
}: {
  missionId: string
  contactId: string
}): Promise<{ success?: boolean; error?: string }> {
  if (!missionId || !contactId) {
    return { error: "Paramètres manquants pour supprimer le contact." }
  }

  try {
    const supabase = await createClient()

    const { data: mission, error: fetchError } = await supabase
      .from("missions")
      .select("id, metadata, opportunity_id")
      .eq("id", missionId)
      .maybeSingle()

    if (fetchError || !mission) {
      return { error: `Mission introuvable : ${fetchError?.message || ""}` }
    }

    const currentMeta = (mission.metadata || {}) as Record<string, unknown>
    let baseList = parseMissionContacts(mission.metadata)

    // Si mission_contacts est encore vide, initialiser depuis contact_ids ou opportunity_contacts
    if (baseList.length === 0) {
      const existingIds = parseContactIds(mission.metadata)
      if (existingIds.length > 0) {
        baseList = existingIds.map((id) => ({
          contact_id: id,
          role: "Manager opérationnel",
        }))
      } else if (mission.opportunity_id) {
        const { data: oppContacts } = await supabase
          .from("opportunity_contacts")
          .select("contact_id, role")
          .eq("opportunity_id", mission.opportunity_id)
        if (oppContacts && oppContacts.length > 0) {
          baseList = oppContacts.map((oc) => ({
            contact_id: oc.contact_id,
            role: oc.role || "Manager opérationnel",
          }))
        }
      }
    }

    const updatedList = baseList.filter((item) => item.contact_id !== contactId)
    const contactIds = updatedList.map((item) => item.contact_id)

    const updatedMetadata = {
      ...currentMeta,
      mission_contacts: updatedList,
      contact_ids: contactIds,
    }

    const { error: updateError } = await supabase
      .from("missions")
      .update({ metadata: updatedMetadata as unknown as Json })
      .eq("id", missionId)

    if (updateError) {
      return { error: `Erreur de suppression : ${updateError.message}` }
    }

    revalidatePath("/missions")
    return { success: true }
  } catch (err) {
    console.error("[removeMissionContact] unhandled", err)
    return { error: "Une erreur inattendue est survenue." }
  }
}
