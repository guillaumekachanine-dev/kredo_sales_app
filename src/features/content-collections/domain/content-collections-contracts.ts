// Contrats du domaine « Listes / Corpus » (content_collections / content_collection_items).
// Source unique de vérité pour les types partagés entre data layer, Server Actions et composants.
//
// Une Liste (kind="list") regroupe des objets homogènes d'un seul item_type.
// Un Corpus (kind="corpus") est hétérogène : ses items portent chacun leur
// propre content_type, y compris "knowledge_list" — référence vers une Liste
// existante incluse dans le Corpus. Pas de Corpus dans un Corpus en V1
// (cf. isEligibleForKnowledgeListReference).

export type CollectionKind = "list" | "corpus"

/**
 * Types métier réellement "ajoutables" depuis un objet KREDO via l'action
 * transversale « Ajouter à… » (Lot 3) — chacun a une entrée dans le registre
 * `content-type-registry.ts`. C'est aussi le seul sous-ensemble valide pour
 * `content_collections.item_type` (une Liste est homogène sur l'un de ces
 * types, jamais sur "knowledge_list").
 */
export type AddableContentType = "veille_article" | "intelligence_document"

export type CollectionContentType = AddableContentType | "knowledge_list"

export const COLLECTION_CONTENT_TYPE_LABELS: Record<CollectionContentType, string> = {
  veille_article: "Article de veille",
  intelligence_document: "Document",
  knowledge_list: "Liste",
}

export function isCollectionContentType(value: string): value is CollectionContentType {
  return value === "veille_article" || value === "intelligence_document" || value === "knowledge_list"
}

export function isAddableContentType(value: string): value is AddableContentType {
  return value === "veille_article" || value === "intelligence_document"
}

export type CollectionSummary = {
  id: string
  kind: CollectionKind
  itemType: AddableContentType | null
  name: string
  description: string | null
  itemCount: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Garde-fou métier (miroir du trigger `private.validate_content_collection_item`) :
 * seule une Liste peut être référencée par un membership "knowledge_list" — jamais
 * un Corpus. Interdit le Corpus dans un Corpus en V1.
 */
export function isEligibleForKnowledgeListReference(referenced: Pick<CollectionSummary, "kind">): boolean {
  return referenced.kind === "list"
}

export type ResolvedCollectionItem = {
  membershipId: string
  contentType: CollectionContentType
  contentId: string
  addedAt: string
  position: number | null
  title: string
  typeLabel: string
  date: string | null
  preview: string | null
  categoryLabel?: string | null
  documentType?: string | null
  url: string | null
}

export type ResolvedCollectionItemDetail = {
  contentType: CollectionContentType
  contentId: string
  title: string
  typeLabel: string
  categoryLabel: string | null
  date: string | null
  url: string | null
  // Veille article
  sourceName?: string | null
  secteurPrincipal?: string | null
  resume?: string | null
  analyseKredo?: string | null
  actionCommerciale?: string | null
  tags?: string[] | null
  digestId?: string | null
  digestTitle?: string | null
  digestDate?: string | null
  // Intelligence document
  contentText?: string | null
  contentJson?: unknown | null
  documentType?: string | null
}

/**
 * Ordre d'affichage des items d'une collection : items positionnés
 * (ordre manuel, cf. `reorderCollectionItemsAction`) d'abord, par `position`
 * croissante ; items sans position ensuite, dans l'ordre où ils arrivent
 * (tri stable) — reproduit le comportement historique (le plus récent
 * d'abord) tant qu'aucun ordre manuel n'a été posé sur la collection.
 */
export function sortResolvedItems(items: ResolvedCollectionItem[]): ResolvedCollectionItem[] {
  return [...items].sort((a, b) => {
    if (a.position !== null && b.position !== null) return a.position - b.position
    if (a.position !== null) return -1
    if (b.position !== null) return 1
    return 0
  })
}

export type ResolvedItemGroup = {
  contentType: CollectionContentType
  typeLabel: string
  items: ResolvedCollectionItem[]
}

/** Regroupe les items d'un Corpus par content_type, dans leur ordre d'apparition. */
export function groupResolvedItemsByType(items: ResolvedCollectionItem[]): ResolvedItemGroup[] {
  const order: CollectionContentType[] = []
  const byType = new Map<CollectionContentType, ResolvedCollectionItem[]>()
  for (const item of items) {
    if (!byType.has(item.contentType)) {
      byType.set(item.contentType, [])
      order.push(item.contentType)
    }
    byType.get(item.contentType)!.push(item)
  }
  return order.map((contentType) => ({
    contentType,
    typeLabel: COLLECTION_CONTENT_TYPE_LABELS[contentType],
    items: byType.get(contentType)!,
  }))
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
