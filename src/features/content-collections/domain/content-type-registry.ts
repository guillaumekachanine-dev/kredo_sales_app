// Registre minimal des content types "ajoutables" (Lot 3 — action transversale
// « Ajouter à… »). Chaque entrée pointe vers une table CANONIQUE existante —
// jamais une déduction depuis un libellé d'UI. Un nouveau type s'ajoute ici
// UNIQUEMENT en miroir d'une nouvelle branche dans le trigger
// `private.validate_content_collection_item` (supabase/migrations).
//
// Volontairement pas un framework : juste assez de champs pour piloter le
// picker (`use-add-to-list.ts`) et la résolution d'affichage dans Connaissances
// (`fetchResolvedCollectionItems`).

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { AddableContentType } from "./content-collections-contracts"

export type ResolvedContentMeta = {
  title: string
  date: string | null
  preview: string | null
}

export type ContentTypeRegistryEntry = {
  contentType: AddableContentType
  /** Libellé singulier, ex. "Article de veille". */
  label: string
  /** Libellé pluriel compact utilisé dans les copies du picker ("Aucune liste de {pluralLabel}"). */
  pluralLabel: string
  /** URL de navigation vers l'objet — best-effort : /veille n'a pas de deep-link par article. */
  buildUrl: (contentId: string) => string
  /** Résolution en masse pour l'affichage dans Connaissances — jamais de copie, juste titre/date/aperçu. */
  resolveMany: (
    supabase: SupabaseClient<Database>,
    ids: string[],
  ) => Promise<Map<string, ResolvedContentMeta>>
}

function truncate(value: string | null, maxLength: number): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed
}

const veilleArticleEntry: ContentTypeRegistryEntry = {
  contentType: "veille_article",
  label: "Article de veille",
  pluralLabel: "articles de veille",
  buildUrl: () => "/veille",
  resolveMany: async (supabase, ids) => {
    const resolved = new Map<string, ResolvedContentMeta>()
    if (ids.length === 0) return resolved
    const { data } = await supabase
      .from("veille_articles")
      .select("id, titre_fr, published_at, resume")
      .in("id", ids)
    for (const row of data ?? []) {
      resolved.set(row.id, { title: row.titre_fr, date: row.published_at, preview: row.resume })
    }
    return resolved
  },
}

const intelligenceDocumentEntry: ContentTypeRegistryEntry = {
  contentType: "intelligence_document",
  label: "Document",
  pluralLabel: "documents",
  buildUrl: (contentId) => `/reports?doc=${contentId}`,
  resolveMany: async (supabase, ids) => {
    const resolved = new Map<string, ResolvedContentMeta>()
    if (ids.length === 0) return resolved
    const { data } = await supabase
      .from("intelligence_documents")
      .select("id, title, updated_at, current_content_text")
      .in("id", ids)
    for (const row of data ?? []) {
      resolved.set(row.id, {
        title: row.title,
        date: row.updated_at,
        preview: truncate(row.current_content_text, 160),
      })
    }
    return resolved
  },
}

export const CONTENT_TYPE_REGISTRY: Record<AddableContentType, ContentTypeRegistryEntry> = {
  veille_article: veilleArticleEntry,
  intelligence_document: intelligenceDocumentEntry,
}

export function getContentTypeRegistryEntry(contentType: AddableContentType): ContentTypeRegistryEntry {
  return CONTENT_TYPE_REGISTRY[contentType]
}
