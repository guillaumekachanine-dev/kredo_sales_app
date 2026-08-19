// Familles de sources du compositeur L1 — un onglet du picker par famille,
// dans l'ordre imposé par le cadrage (§5).

import type { WatchAnalysisSource } from "@/lib/n8n/types"

export type SourceFamily = WatchAnalysisSource["kind"]

export const SOURCE_FAMILIES: SourceFamily[] = [
  "digest",
  "account_signals",
  "intelligence_documents",
  "knowledge_collection",
]

export const SOURCE_FAMILY_LABELS: Record<SourceFamily, string> = {
  digest: "Digest & articles",
  account_signals: "Signaux comptes",
  intelligence_documents: "Rapports & documents",
  knowledge_collection: "Listes & Corpus",
}

/** Nombre d'éléments choisis dans un groupe, quand il est directement lisible depuis le contrat. */
export function sourceItemCount(source: WatchAnalysisSource): number | null {
  switch (source.kind) {
    case "digest":
      return source.articleIds ? source.articleIds.length : null
    case "account_signals":
      return source.signalIds.length
    case "intelligence_documents":
      return source.documentIds.length
    case "knowledge_collection":
      return null
  }
}
