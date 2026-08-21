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
import { getDocumentTypeLabel } from "@/components/reports/document-display"
import type { AddableContentType } from "./content-collections-contracts"

export type ResolvedContentMeta = {
  title: string
  date: string | null
  preview: string | null
  categoryLabel?: string | null
  documentType?: string | null
}

export type ContentTypeRegistryEntry = {
  contentType: AddableContentType
  /** Libellé singulier, ex. "Article de veille". */
  label: string
  /** Libellé pluriel compact utilisé dans les copies du picker ("Aucune liste de {pluralLabel}"). */
  pluralLabel: string
  /** URL de navigation vers l'objet — best-effort : /veille n'a pas de deep-link par article. */
  buildUrl: (contentId: string) => string
  /** Résolution optimisée en lot pour la vue Liste/Corpus. */
  resolveMany: (
    supabase: SupabaseClient<Database>,
    ids: string[],
  ) => Promise<Map<string, ResolvedContentMeta>>
}

function truncate(text: string | null, maxLen: number): string | null {
  if (!text) return null
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (!cleaned) return null
  if (cleaned.length <= maxLen) return cleaned
  return `${cleaned.slice(0, maxLen)}…`
}

const veilleArticleEntry: ContentTypeRegistryEntry = {
  contentType: "veille_article",
  label: "Article de veille",
  pluralLabel: "articles",
  buildUrl: () => "/veille",
  resolveMany: async (supabase, ids) => {
    const resolved = new Map<string, ResolvedContentMeta>()
    if (ids.length === 0) return resolved
    const { data } = await supabase
      .from("veille_articles")
      .select("id, titre_fr, published_at, resume, categorie")
      .in("id", ids)
    for (const row of data ?? []) {
      resolved.set(row.id, {
        title: row.titre_fr,
        date: row.published_at,
        preview: row.resume,
        categoryLabel: row.categorie || null,
      })
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
      .select("id, title, updated_at, current_content_text, document_type")
      .in("id", ids)
    for (const row of data ?? []) {
      resolved.set(row.id, {
        title: row.title,
        date: row.updated_at,
        preview: truncate(row.current_content_text, 160),
        categoryLabel: row.document_type ? getDocumentTypeLabel(row.document_type) : null,
        documentType: row.document_type || null,
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
