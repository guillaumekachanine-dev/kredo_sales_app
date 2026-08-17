"use client"

// Lectures directes depuis le navigateur : la RLS workspace/propriétaire de
// `content_collections`/`content_collection_items` protège déjà l'isolation,
// même pattern que `SignalDialogs.tsx` pour les listes ouvertes en dialogue.

import { createClient } from "@/lib/supabase/client"
import {
  COLLECTION_CONTENT_TYPE_LABELS,
  isAddableContentType,
  isCollectionContentType,
  sortResolvedItems,
  type AddableContentType,
  type CollectionContentType,
  type CollectionKind,
  type CollectionSummary,
  type ResolvedCollectionItem,
} from "../domain/content-collections-contracts"
import { getContentTypeRegistryEntry, type ResolvedContentMeta } from "../domain/content-type-registry"

export async function fetchCollectionsSummary(): Promise<CollectionSummary[]> {
  const supabase = createClient()
  const [{ data: collections, error: collectionsError }, { data: items }] = await Promise.all([
    supabase
      .from("content_collections")
      .select("id, kind, item_type, name, description, created_by, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase.from("content_collection_items").select("collection_id"),
  ])

  if (collectionsError || !collections) return []

  const countByCollection = new Map<string, number>()
  for (const item of items ?? []) {
    countByCollection.set(item.collection_id, (countByCollection.get(item.collection_id) ?? 0) + 1)
  }

  return collections.map((row) => ({
    id: row.id,
    kind: row.kind as CollectionKind,
    itemType: row.item_type as AddableContentType | null,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: countByCollection.get(row.id) ?? 0,
  }))
}

export async function fetchMembershipForContent(
  contentType: CollectionContentType,
  contentId: string,
): Promise<Set<string>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("content_collection_items")
    .select("collection_id")
    .eq("content_type", contentType)
    .eq("content_id", contentId)

  if (error || !data) return new Set()
  return new Set(data.map((row) => row.collection_id))
}

/**
 * Résout chaque membership vers son contenu canonique. Deux mécanismes :
 * - types "ajoutables" (`AddableContentType`) : résolus génériquement via le
 *   registre `content-type-registry.ts` — ajouter un type = ajouter une
 *   entrée au registre + une branche au trigger
 *   `private.validate_content_collection_item`, rien à changer ici ;
 * - `knowledge_list` (Liste incluse dans un Corpus) : cas particulier
 *   structurel du modèle collection, résolu à part (référence une autre
 *   `content_collections`, pas un objet métier).
 * Tri : `sortResolvedItems` (ordre manuel via `position`, fallback sur
 * l'ordre historique created_at desc).
 */
export async function fetchResolvedCollectionItems(collectionId: string): Promise<ResolvedCollectionItem[]> {
  const supabase = createClient()
  const { data: memberships, error } = await supabase
    .from("content_collection_items")
    .select("id, content_type, content_id, created_at, position")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })

  if (error || !memberships || memberships.length === 0) return []

  const idsByType = new Map<AddableContentType, string[]>()
  const knowledgeListIds: string[] = []
  for (const row of memberships) {
    if (row.content_type === "knowledge_list") {
      knowledgeListIds.push(row.content_id)
      continue
    }
    if (!isAddableContentType(row.content_type)) continue
    const ids = idsByType.get(row.content_type) ?? []
    ids.push(row.content_id)
    idsByType.set(row.content_type, ids)
  }

  const metaByType = new Map<AddableContentType, Map<string, ResolvedContentMeta>>()
  const listsById = new Map<string, { name: string; description: string | null }>()

  await Promise.all([
    ...Array.from(idsByType.entries()).map(async ([contentType, ids]) => {
      const meta = await getContentTypeRegistryEntry(contentType).resolveMany(supabase, ids)
      metaByType.set(contentType, meta)
    }),
    knowledgeListIds.length > 0
      ? supabase
          .from("content_collections")
          .select("id, name, description")
          .in("id", knowledgeListIds)
          .then(({ data }) => {
            for (const list of data ?? []) listsById.set(list.id, list)
          })
      : Promise.resolve(),
  ])

  const resolved = memberships.flatMap((row): ResolvedCollectionItem[] => {
    if (!isCollectionContentType(row.content_type)) return []

    if (row.content_type === "knowledge_list") {
      const list = listsById.get(row.content_id)
      // Liste supprimée depuis : membership orphelin, masqué.
      if (!list) return []
      return [
        {
          membershipId: row.id,
          contentType: row.content_type,
          contentId: row.content_id,
          addedAt: row.created_at,
          position: row.position,
          title: list.name,
          typeLabel: COLLECTION_CONTENT_TYPE_LABELS.knowledge_list,
          date: null,
          preview: list.description,
          url: null,
        },
      ]
    }

    const meta = metaByType.get(row.content_type)?.get(row.content_id)
    // Contenu supprimé depuis (article purgé, document supprimé…) : membership orphelin, masqué.
    if (!meta) return []
    return [
      {
        membershipId: row.id,
        contentType: row.content_type,
        contentId: row.content_id,
        addedAt: row.created_at,
        position: row.position,
        title: meta.title,
        typeLabel: COLLECTION_CONTENT_TYPE_LABELS[row.content_type],
        date: meta.date,
        preview: meta.preview,
        url: getContentTypeRegistryEntry(row.content_type).buildUrl(row.content_id),
      },
    ]
  })

  return sortResolvedItems(resolved)
}
