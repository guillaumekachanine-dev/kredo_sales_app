import "server-only"

/**
 * Provider de corpus `intelligence_document` — ADR-0020 §5.1.
 *
 * Hydrate le contenu réel des documents demandés (`current_content_text`, à défaut
 * `current_content_json`). À ne pas confondre avec `content-type-registry.ts`, qui rend
 * un aperçu de 160 caractères pour l'affichage et ne filtre pas l'archivage.
 *
 * Mode d'exécution : `user_rls`. `intelligence_documents` porte le motif RLS workspace
 * standard (vérifié live le 2026-08-18) ; le `.eq("workspace_id", …)` explicite est la
 * seconde serrure. Conséquence voulue : un identifiant appartenant à un autre workspace
 * ne remonte aucune ligne et ressort en trace `not_found` — la trace ne dit jamais si le
 * document existe ailleurs.
 */

import type { Json } from "@/types/database"
import type {
  CorpusExclusion,
  CorpusItem,
  CorpusProvider,
  CorpusProviderResult,
  CorpusResolveContext,
} from "../../domain/mission-contracts"

export const INTELLIGENCE_DOCUMENT_WEIGHT = 70

function contentFromJson(value: Json | null): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  // Indenté : le corpus est lu par un LLM, pas par une machine. La taille reste bornée
  // par `maxCharsPerItem`.
  const serialized = JSON.stringify(value, null, 2)
  return serialized === "{}" || serialized === "[]" ? "" : serialized
}

export const intelligenceDocumentProvider: CorpusProvider<{
  kind: "intelligence_document"
  ids: string[]
}> = {
  kind: "intelligence_document",
  execution: "user_rls",
  weight: INTELLIGENCE_DOCUMENT_WEIGHT,

  async resolve(ctx: CorpusResolveContext, selector): Promise<CorpusProviderResult> {
    const items: CorpusItem[] = []
    const exclusions: CorpusExclusion[] = []
    if (selector.ids.length === 0) return { items, exclusions }

    const { data, error } = await ctx.supabase
      .from("intelligence_documents")
      .select(
        "id, title, document_type, status, archived_at, updated_at, current_content_text, current_content_json",
      )
      .eq("workspace_id", ctx.workspaceId)
      .in("id", selector.ids)

    if (error) {
      throw new Error(`Lecture des documents d'intelligence impossible : ${error.message}`)
    }

    const byId = new Map((data ?? []).map((row) => [row.id, row]))

    // On parcourt les identifiants DEMANDÉS, pas les lignes rendues : l'ordre est stable
    // et chaque demande obtient sa ligne de trace, y compris quand rien ne remonte.
    for (const id of selector.ids) {
      const row = byId.get(id)

      if (!row) {
        exclusions.push({
          ref: { kind: "intelligence_document", table: "intelligence_documents", id },
          title: "Document introuvable",
          provenance: "intelligence_documents",
          reason: "not_found",
        })
        continue
      }

      // `archived_at` fait foi (consigne L1). `status === "archived"` est testé en plus :
      // rien en base ne garantit que les deux restent cohérents, et laisser passer un
      // document archivé serait pire qu'en écarter un de trop — l'écart est tracé.
      if (row.archived_at !== null || row.status === "archived") {
        exclusions.push({
          ref: { kind: "intelligence_document", table: "intelligence_documents", id: row.id },
          title: row.title,
          provenance: `intelligence_documents · ${row.document_type}`,
          reason: "archived",
        })
        continue
      }

      const content = (row.current_content_text?.trim() || contentFromJson(row.current_content_json)).trim()
      if (!content) {
        exclusions.push({
          ref: { kind: "intelligence_document", table: "intelligence_documents", id: row.id },
          title: row.title,
          provenance: `intelligence_documents · ${row.document_type}`,
          reason: "not_found",
        })
        continue
      }

      items.push({
        ref: { kind: "intelligence_document", table: "intelligence_documents", id: row.id },
        title: row.title,
        date: row.updated_at,
        provenance: `intelligence_documents · ${row.document_type}`,
        content,
        chars: content.length,
      })
    }

    return { items, exclusions }
  },
}
