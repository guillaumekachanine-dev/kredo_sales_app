"use client"

// Lectures directes depuis le navigateur : la RLS workspace/propriétaire de
// `content_collections`/`content_collection_items` protège déjà l'isolation,
// même pattern que `SignalDialogs.tsx` pour les listes ouvertes en dialogue.

import { createClient } from "@/lib/supabase/client"
import {
  COLLECTION_CONTENT_TYPE_LABELS,
  isCollectionContentType,
  type CollectionContentType,
  type CollectionSummary,
  type ResolvedCollectionItem,
} from "../domain/content-collections-contracts"

export async function fetchCollectionsSummary(): Promise<CollectionSummary[]> {
  const supabase = createClient()
  const [{ data: collections, error: collectionsError }, { data: items }] = await Promise.all([
    supabase
      .from("content_collections")
      .select("id, name, description, created_by, created_at, updated_at")
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
 * Résout chaque membership vers son contenu canonique. Un seul `content_type`
 * est supporté aujourd'hui (`veille_article`) : ajouter une branche ici en
 * même temps qu'une nouvelle valeur au CHECK de `content_collection_items`
 * en base et au trigger `private.validate_content_collection_item`.
 */
export async function fetchResolvedCollectionItems(collectionId: string): Promise<ResolvedCollectionItem[]> {
  const supabase = createClient()
  const { data: memberships, error } = await supabase
    .from("content_collection_items")
    .select("id, content_type, content_id, created_at")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false })

  if (error || !memberships || memberships.length === 0) return []

  const veilleArticleIds = memberships
    .filter((row) => row.content_type === "veille_article")
    .map((row) => row.content_id)

  const articlesById = new Map<
    string,
    { titre_fr: string; published_at: string | null; resume: string | null; url: string | null }
  >()

  if (veilleArticleIds.length > 0) {
    const { data: articles } = await supabase
      .from("veille_articles")
      .select("id, titre_fr, published_at, resume, url")
      .in("id", veilleArticleIds)
    for (const article of articles ?? []) {
      articlesById.set(article.id, article)
    }
  }

  return memberships.flatMap((row) => {
    if (!isCollectionContentType(row.content_type)) return []

    if (row.content_type === "veille_article") {
      const article = articlesById.get(row.content_id)
      // Contenu supprimé depuis (article de veille purgé) : membership orphelin, masqué.
      if (!article) return []
      return [
        {
          membershipId: row.id,
          contentType: row.content_type,
          contentId: row.content_id,
          addedAt: row.created_at,
          title: article.titre_fr,
          typeLabel: COLLECTION_CONTENT_TYPE_LABELS.veille_article,
          date: article.published_at,
          preview: article.resume,
          url: article.url,
        },
      ]
    }

    return []
  })
}
