import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { isAddableContentType, type AddableContentType, type CollectionKind } from "../domain/content-collections-contracts"

export type KnowledgeScopeRef = { contentType: AddableContentType; contentId: string }

export type ResolvedKnowledgeScope = {
  collectionId: string
  kind: CollectionKind
  name: string
  itemCount: number
  refs: KnowledgeScopeRef[]
}

/**
 * Résout un Knowledge Scope (Liste ou Corpus) en références normalisées
 * {contentType, contentId} — jamais en contenu métier copié. Reçoit un
 * client Supabase déjà authentifié : la RLS workspace fait le reste, aucun
 * `refs` transmis par le navigateur n'est jamais utilisé, cette fonction
 * repart toujours du seul `collectionId` et relit `content_collections`/
 * `content_collection_items`.
 *
 * LISTE : ses items (homogènes, item_type).
 * CORPUS : ses items directs + les Listes qu'il référence via `knowledge_list`
 * développées sur un seul niveau (jamais de Corpus imbriqué — garanti par le
 * trigger `private.validate_content_collection_item` à l'écriture, revérifié
 * ici en défense en profondeur), dédupliqué par `${contentType}:${contentId}`.
 */
export async function resolveKnowledgeScope(
  supabase: SupabaseClient<Database>,
  collectionId: string,
): Promise<ResolvedKnowledgeScope | { error: string }> {
  const { data: collection, error: collectionError } = await supabase
    .from("content_collections")
    .select("id, kind, name")
    .eq("id", collectionId)
    .maybeSingle()

  if (collectionError) return { error: collectionError.message }
  if (!collection) return { error: "Collection introuvable." }

  const kind = collection.kind as CollectionKind

  const { data: directItems, error: directError } = await supabase
    .from("content_collection_items")
    .select("content_type, content_id")
    .eq("collection_id", collectionId)

  if (directError) return { error: directError.message }

  if (kind === "list") {
    const refs: KnowledgeScopeRef[] = (directItems ?? [])
      .filter((item) => isAddableContentType(item.content_type))
      .map((item) => ({ contentType: item.content_type as AddableContentType, contentId: item.content_id }))

    return { collectionId, kind, name: collection.name, itemCount: refs.length, refs }
  }

  const dedup = new Map<string, KnowledgeScopeRef>()
  const referencedListIds: string[] = []

  for (const item of directItems ?? []) {
    if (item.content_type === "knowledge_list") {
      referencedListIds.push(item.content_id)
      continue
    }
    if (!isAddableContentType(item.content_type)) continue
    dedup.set(`${item.content_type}:${item.content_id}`, {
      contentType: item.content_type as AddableContentType,
      contentId: item.content_id,
    })
  }

  if (referencedListIds.length > 0) {
    const { data: referencedLists, error: listsError } = await supabase
      .from("content_collections")
      .select("id, kind")
      .in("id", referencedListIds)

    if (listsError) return { error: listsError.message }

    const validListIds = (referencedLists ?? [])
      .filter((row) => (row.kind as CollectionKind) === "list")
      .map((row) => row.id)

    if (validListIds.length > 0) {
      const { data: expandedItems, error: expandedError } = await supabase
        .from("content_collection_items")
        .select("content_type, content_id")
        .in("collection_id", validListIds)

      if (expandedError) return { error: expandedError.message }

      for (const item of expandedItems ?? []) {
        if (!isAddableContentType(item.content_type)) continue
        dedup.set(`${item.content_type}:${item.content_id}`, {
          contentType: item.content_type as AddableContentType,
          contentId: item.content_id,
        })
      }
    }
  }

  const refs = Array.from(dedup.values())
  return { collectionId, kind, name: collection.name, itemCount: refs.length, refs }
}
