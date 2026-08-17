"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  validateCollectionName,
  type CollectionContentType,
  type MutationResult,
} from "../domain/content-collections-contracts"

const UNIQUE_CONSTRAINT_TARGET = "collection_id,content_type,content_id"

type ActingClient =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; error: string }

async function resolveAuthenticatedClient(): Promise<ActingClient> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { ok: false, error: "Non authentifié." }
  return { ok: true, supabase }
}

export type CreateCollectionResult = { success: true; id: string } | { success: false; error: string }

export async function createCollectionAction(name: string, description?: string): Promise<CreateCollectionResult> {
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const validation = validateCollectionName(name)
  if (!validation.ok) return { success: false, error: validation.error }

  const { data, error } = await acting.supabase
    .from("content_collections")
    .insert({ name: validation.value, description: description?.trim() || null })
    .select("id")
    .single()

  if (error || !data) return { success: false, error: error?.message ?? "Échec de la création de la liste." }
  revalidatePath("/veille")
  return { success: true, id: data.id }
}

export async function renameCollectionAction(id: string, name: string): Promise<MutationResult> {
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const validation = validateCollectionName(name)
  if (!validation.ok) return { success: false, error: validation.error }

  const { error } = await acting.supabase
    .from("content_collections")
    .update({ name: validation.value })
    .eq("id", id)

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function updateCollectionDescriptionAction(id: string, description: string): Promise<MutationResult> {
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const { error } = await acting.supabase
    .from("content_collections")
    .update({ description: description.trim() || null })
    .eq("id", id)

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function deleteCollectionAction(id: string): Promise<MutationResult> {
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  // ON DELETE CASCADE sur content_collection_items.collection_id : les
  // memberships disparaissent, jamais les contenus canoniques référencés.
  const { error } = await acting.supabase.from("content_collections").delete().eq("id", id)

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function addItemToCollectionAction(
  collectionId: string,
  contentType: CollectionContentType,
  contentId: string,
): Promise<MutationResult> {
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const { error } = await acting.supabase
    .from("content_collection_items")
    .upsert(
      { collection_id: collectionId, content_type: contentType, content_id: contentId },
      { onConflict: UNIQUE_CONSTRAINT_TARGET, ignoreDuplicates: true },
    )

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

export async function removeItemFromCollectionAction(
  collectionId: string,
  contentType: CollectionContentType,
  contentId: string,
): Promise<MutationResult> {
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const { error } = await acting.supabase
    .from("content_collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("content_type", contentType)
    .eq("content_id", contentId)

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

/** Retrait en masse par id de membership — n'affecte jamais le contenu canonique. */
export async function removeItemsByIdAction(itemIds: string[]): Promise<MutationResult> {
  if (itemIds.length === 0) return { success: true }
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const { error } = await acting.supabase.from("content_collection_items").delete().in("id", itemIds)

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

/** « Ajouter à une autre liste » : ajoute les memberships désignés par `itemIds` vers `destinationCollectionId`, doublons ignorés. */
export async function bulkAddItemsToCollectionAction(
  itemIds: string[],
  destinationCollectionId: string,
): Promise<MutationResult> {
  if (itemIds.length === 0) return { success: true }
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const { data: sourceItems, error: lookupError } = await acting.supabase
    .from("content_collection_items")
    .select("content_type, content_id")
    .in("id", itemIds)

  if (lookupError) return { success: false, error: lookupError.message }
  if (!sourceItems || sourceItems.length === 0) return { success: true }

  const payload = sourceItems.map((item) => ({
    collection_id: destinationCollectionId,
    content_type: item.content_type,
    content_id: item.content_id,
  }))

  const { error } = await acting.supabase
    .from("content_collection_items")
    .upsert(payload, { onConflict: UNIQUE_CONSTRAINT_TARGET, ignoreDuplicates: true })

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  return { success: true }
}

/**
 * « Déplacer vers… » : implémentation volontairement simple (1) ajouter les
 * memberships vers la destination, (2) supprimer ceux de la source — les
 * `itemIds` identifient déjà les memberships de la collection source, pas
 * besoin de la reciter.
 */
export async function moveItemsToCollectionAction(
  itemIds: string[],
  destinationCollectionId: string,
): Promise<MutationResult> {
  const addResult = await bulkAddItemsToCollectionAction(itemIds, destinationCollectionId)
  if (!addResult.success) return addResult
  return removeItemsByIdAction(itemIds)
}
