// ─── Résolution de l'artefact account_knowledge à afficher ──────────────────
// Lot 1. Module pur (aucun accès base, pas de `server-only`) pour rester
// testable isolément : intelligence-data.ts le réexporte pour ses consommateurs.

import type {
  AccountKnowledgeContent,
  AccountKnowledgeContentV2,
} from "./account-intelligence-contracts"
import { parseAccountKnowledgeArtifact } from "./intelligence-validators"

/**
 * La version est portée explicitement : V1 (faits à provenance, non sourcés) et
 * V2 (Claims sourcés) n'ont aucun champ en commun, et aucune conversion de l'une
 * vers l'autre n'existe — elle fabriquerait des sources inexistantes.
 */
export type AccountKnowledgeState =
  | { version: 1; data: AccountKnowledgeContent; resultId: string; createdAt: string }
  | { version: 2; data: AccountKnowledgeContentV2; resultId: string; createdAt: string }

export type AccountKnowledgeResultRow = {
  id: string
  content_json: unknown
  created_at: string
}

/**
 * Ordre imposé : dernier V2 réussi, à défaut dernier V1 réussi, à défaut `null`
 * (état vide). Les lignes sont attendues triées par `created_at` décroissant —
 * le premier V2 rencontré est donc bien le plus récent.
 *
 * Un artefact non conforme est ignoré, jamais réparé : mieux vaut retomber sur
 * la version précédente que d'afficher une structure à moitié valide.
 */
export function resolveAccountKnowledgeState(
  rows: readonly AccountKnowledgeResultRow[],
): AccountKnowledgeState | null {
  let firstV1: AccountKnowledgeState | null = null

  for (const row of rows) {
    const parsed = parseAccountKnowledgeArtifact(row.content_json)
    if (parsed.version === 2) {
      return { version: 2, data: parsed.content, resultId: row.id, createdAt: row.created_at }
    }
    if (parsed.version === 1 && !firstV1) {
      firstV1 = { version: 1, data: parsed.content, resultId: row.id, createdAt: row.created_at }
    }
  }

  return firstV1
}
