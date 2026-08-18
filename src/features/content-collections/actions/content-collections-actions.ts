"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  isEligibleForKnowledgeListReference,
  validateCollectionName,
  type AddableContentType,
  type CollectionContentType,
  type CollectionKind,
  type MutationResult,
} from "../domain/content-collections-contracts"
import { resolveKnowledgeScope } from "../data/resolve-knowledge-scope"

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

export async function createCollectionAction(
  name: string,
  description?: string,
  itemType: AddableContentType = "veille_article",
): Promise<CreateCollectionResult> {
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const validation = validateCollectionName(name)
  if (!validation.ok) return { success: false, error: validation.error }

  const { data, error } = await acting.supabase
    .from("content_collections")
    .insert({
      name: validation.value,
      description: description?.trim() || null,
      kind: "list",
      item_type: itemType,
    })
    .select("id")
    .single()

  if (error || !data) return { success: false, error: error?.message ?? "Échec de la création de la liste." }
  revalidatePath("/veille")
  revalidatePath("/reports")
  return { success: true, id: data.id }
}

/** Crée un Corpus vide (kind="corpus", item_type NULL — hétérogène par nature). */
export async function createCorpusAction(name: string, description?: string): Promise<CreateCollectionResult> {
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const validation = validateCollectionName(name)
  if (!validation.ok) return { success: false, error: validation.error }

  const { data, error } = await acting.supabase
    .from("content_collections")
    .insert({ name: validation.value, description: description?.trim() || null, kind: "corpus", item_type: null })
    .select("id")
    .single()

  if (error || !data) return { success: false, error: error?.message ?? "Échec de la création du corpus." }
  revalidatePath("/reports")
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
  revalidatePath("/reports")
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
  revalidatePath("/reports")
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
  revalidatePath("/reports")
  return { success: true }
}

export async function addItemToCollectionAction(
  collectionId: string,
  contentType: CollectionContentType,
  contentId: string,
): Promise<MutationResult> {
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const { data: destination, error: destinationError } = await acting.supabase
    .from("content_collections")
    .select("kind, item_type")
    .eq("id", collectionId)
    .maybeSingle()
  if (destinationError || !destination) return { success: false, error: "Collection introuvable." }

  // "knowledge_list" = référence d'une Liste incluse dans un Corpus — jamais
  // l'inverse (pas de Corpus dans un Corpus en V1, cf. isEligibleForKnowledgeListReference).
  if (contentType === "knowledge_list") {
    if (contentId === collectionId) {
      return { success: false, error: "Une liste ne peut pas se référencer elle-même." }
    }
    if (destination.kind !== "corpus") {
      return { success: false, error: "Une Liste ne peut être incluse que dans un Corpus." }
    }

    const { data: referenced, error: referencedError } = await acting.supabase
      .from("content_collections")
      .select("kind")
      .eq("id", contentId)
      .maybeSingle()
    if (referencedError || !referenced) return { success: false, error: "Liste introuvable." }
    if (!isEligibleForKnowledgeListReference({ kind: referenced.kind as CollectionKind })) {
      return { success: false, error: "Seule une Liste peut être incluse dans un Corpus (pas de Corpus dans un Corpus)." }
    }
  } else if (destination.kind === "list" && destination.item_type !== contentType) {
    // Une Liste est homogène : on ne peut y ajouter que des objets de son item_type.
    return { success: false, error: "Cette liste n'accepte pas ce type de contenu." }
  }

  const { error } = await acting.supabase
    .from("content_collection_items")
    .upsert(
      { collection_id: collectionId, content_type: contentType, content_id: contentId },
      { onConflict: UNIQUE_CONSTRAINT_TARGET, ignoreDuplicates: true },
    )

  if (error) return { success: false, error: error.message }
  revalidatePath("/veille")
  revalidatePath("/reports")
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
  revalidatePath("/reports")
  return { success: true }
}

/**
 * Ordre manuel : réécrit `position` (0..n-1) pour les memberships listés,
 * dans l'ordre reçu — idempotent, normalise aussi les items sans position
 * préalable. Nécessite la policy UPDATE ajoutée en migration 084 (081 ne
 * permettait pas d'UPDATE sur content_collection_items).
 */
export async function reorderCollectionItemsAction(
  collectionId: string,
  orderedMembershipIds: string[],
): Promise<MutationResult> {
  if (orderedMembershipIds.length === 0) return { success: true }
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const results = await Promise.all(
    orderedMembershipIds.map((id, index) =>
      acting.supabase
        .from("content_collection_items")
        .update({ position: index })
        .eq("id", id)
        .eq("collection_id", collectionId),
    ),
  )

  const failed = results.find((result) => result.error)
  if (failed?.error) return { success: false, error: failed.error.message }
  revalidatePath("/reports")
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
  revalidatePath("/reports")
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
  revalidatePath("/reports")
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

export type ResolveCollectionArticleIdsResult =
  | { success: true; articleIds: string[] }
  | { success: false; error: string }

export async function resolveCollectionArticleIdsAction(
  collectionId: string,
): Promise<ResolveCollectionArticleIdsResult> {
  const acting = await resolveAuthenticatedClient()
  if (!acting.ok) return { success: false, error: acting.error }

  const result = await resolveKnowledgeScope(acting.supabase, collectionId)
  if ("error" in result) {
    return { success: false, error: result.error }
  }

  const articleIds = result.refs
    .filter((ref) => ref.contentType === "veille_article")
    .map((ref) => ref.contentId)

  return { success: true, articleIds }
}

