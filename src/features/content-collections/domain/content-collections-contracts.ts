// Contrats du domaine « Listes de contenus » (content_collections / content_collection_items).
// Source unique de vérité pour les types partagés entre data layer, Server Actions et composants.

export type CollectionContentType = "veille_article"

export const COLLECTION_CONTENT_TYPE_LABELS: Record<CollectionContentType, string> = {
  veille_article: "Article de veille",
}

export function isCollectionContentType(value: string): value is CollectionContentType {
  return value === "veille_article"
}

export type CollectionSummary = {
  id: string
  name: string
  description: string | null
  itemCount: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export type ResolvedCollectionItem = {
  membershipId: string
  contentType: CollectionContentType
  contentId: string
  addedAt: string
  title: string
  typeLabel: string
  date: string | null
  preview: string | null
  url: string | null
}

export type MutationResult = { success: true } | { success: false; error: string }

const MAX_NAME_LENGTH = 120

export function validateCollectionName(
  name: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: "Le nom de la liste est obligatoire." }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Le nom de la liste est trop long (${MAX_NAME_LENGTH} caractères max).` }
  }
  return { ok: true, value: trimmed }
}
