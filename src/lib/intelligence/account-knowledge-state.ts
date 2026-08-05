// ─── Résolution de l'artefact account_knowledge à afficher ──────────────────
// Lot 1. Module pur (aucun accès base, pas de `server-only`) pour rester
// testable isolément : intelligence-data.ts le réexporte pour ses consommateurs.
//
// Lot 4 — V3 entre dans l'union. Deux conséquences volontaires :
//   - la version reste portée explicitement, et V3 ne dispose d'aucun lecteur
//     visuel avant le Lot 5 : c'est au consommateur de séparer l'état
//     restituable (`AccountKnowledgeRenderableState`, V1/V2) de l'état V3, que
//     le type `AccountKnowledgeV3State` isole nommément ;
//   - une ligne illisible n'est plus seulement ignorée, elle est remontée dans
//     `unreadable`. Retomber en silence sur un artefact plus ancien ferait
//     passer une régression de génération pour une absence de mise à jour.

import type {
  AccountKnowledgeContent,
  AccountKnowledgeContentV2,
  AccountKnowledgeContentV3,
} from "./account-intelligence-contracts"
import { parseAccountKnowledgeArtifact, type ValidationIssue } from "./intelligence-validators"

/**
 * La version est portée explicitement : V1 (faits à provenance, non sourcés),
 * V2 (Claims sourcés) et V3 (Claims sourcés + vérification indépendante) n'ont
 * aucun champ en commun, et aucune conversion de l'une vers l'autre n'existe —
 * elle fabriquerait des sources ou des verdicts inexistants.
 */
export type AccountKnowledgeState =
  | { version: 1; data: AccountKnowledgeContent; resultId: string; createdAt: string }
  | { version: 2; data: AccountKnowledgeContentV2; resultId: string; createdAt: string }
  | { version: 3; data: AccountKnowledgeContentV3; resultId: string; createdAt: string }

/**
 * Sous-ensemble que la couche de restitution actuelle sait afficher. Les
 * composants historiques s'annotent avec ce type : un V3 devient alors une
 * erreur de compilation s'il est passé à un lecteur V1/V2, plutôt qu'un rendu
 * silencieusement amputé.
 */
export type AccountKnowledgeRenderableState = Extract<
  AccountKnowledgeState,
  { version: 1 } | { version: 2 } | { version: 3 }
>

/** État V3 isolé — chargé et typé au Lot 4, restitué au Lot 5. */
export type AccountKnowledgeV3State = Extract<AccountKnowledgeState, { version: 3 }>

export type AccountKnowledgeResultRow = {
  id: string
  content_json: unknown
  created_at: string
}

/** Ligne rejetée par le parseur — conservée pour être signalée, jamais réparée. */
export type AccountKnowledgeUnreadableResult = {
  resultId: string
  createdAt: string
  issues: ValidationIssue[]
}

export type AccountKnowledgeResolution = {
  /** Artefact retenu, ou `null` si aucun n'est lisible (état vide). */
  state: AccountKnowledgeState | null
  /**
   * Lignes plus récentes que `state` (ou toutes, si `state` est `null`) que le
   * parseur a refusées. Non vide = un artefact a bien été produit mais n'est pas
   * conforme : c'est une panne de génération, pas une absence de données.
   */
  unreadable: AccountKnowledgeUnreadableResult[]
}

/**
 * Ordre imposé : premier artefact « moderne » rencontré (V2 ou V3, les lignes
 * étant attendues triées par `created_at` décroissant), à défaut dernier V1, à
 * défaut `null`.
 *
 * V2 et V3 sont départagées par la seule fraîcheur, jamais par un rang de
 * version : une V2 régénérée après une V3 est bien la connaissance courante du
 * compte, et l'inverse est vrai aussi. Seule V1 reste subordonnée — elle ne
 * porte aucun sourcing, elle ne peut pas primer sur un artefact sourcé.
 *
 * Un artefact non conforme est écarté et signalé, jamais réparé : mieux vaut
 * retomber sur la version précédente en le disant que d'afficher une structure
 * à moitié valide.
 */
export function resolveAccountKnowledge(
  rows: readonly AccountKnowledgeResultRow[],
): AccountKnowledgeResolution {
  const unreadable: AccountKnowledgeUnreadableResult[] = []
  let firstV1: AccountKnowledgeState | null = null

  for (const row of rows) {
    const parsed = parseAccountKnowledgeArtifact(row.content_json)

    if (parsed.version === null) {
      unreadable.push({ resultId: row.id, createdAt: row.created_at, issues: parsed.issues })
      continue
    }

    // Branches explicites plutôt qu'une construction générique : `version` et
    // `data` doivent rester corrélés dans le type, un `{ version: 2 | 3 }`
    // rendrait le contenu ambigu chez le consommateur.
    if (parsed.version === 2) {
      return {
        state: { version: 2, data: parsed.content, resultId: row.id, createdAt: row.created_at },
        unreadable,
      }
    }
    if (parsed.version === 3) {
      return {
        state: { version: 3, data: parsed.content, resultId: row.id, createdAt: row.created_at },
        unreadable,
      }
    }
    if (!firstV1) {
      firstV1 = { version: 1, data: parsed.content, resultId: row.id, createdAt: row.created_at }
    }
  }

  return { state: firstV1, unreadable }
}

/**
 * Champs exacts exposés par `ClientIntelligenceData` pour la connaissance
 * compte — dérivés en un seul endroit, testables sans base de données.
 *
 * Revue Lot 4 — extrait d'une logique auparavant recopiée en ligne dans
 * `intelligence-data.ts`, qui avait un défaut réel : `accountKnowledge` étant
 * restreint à V1/V2, un composant qui lisait `accountKnowledge?.createdAt`
 * pour dater la dernière mise à jour affichait « Jamais mise à jour » dès que
 * l'artefact courant était un V3 — alors qu'une génération venait de réussir.
 * `accountKnowledgeLastUpdatedAt` porte donc la date de l'artefact courant
 * quelle que soit sa version, indépendamment de ce que la couche de
 * restitution actuelle sait afficher.
 */
export type AccountKnowledgeDerivedFields = {
  accountKnowledge: AccountKnowledgeRenderableState | null
  accountKnowledgeV3: AccountKnowledgeV3State | null
  /**
   * Date de création de l'artefact COURANT (V1, V2 ou V3 — peu importe),
   * `null` seulement si aucun artefact n'existe. Ne jamais la dériver de
   * `accountKnowledge` seul : ce champ est `null` dès que V3 est courant,
   * et une lecture aveugle produirait une régression silencieuse identique.
   */
  accountKnowledgeLastUpdatedAt: string | null
  unreadable: AccountKnowledgeUnreadableResult[]
}

export function deriveAccountKnowledgeFields(
  rows: readonly AccountKnowledgeResultRow[],
): AccountKnowledgeDerivedFields {
  const { state, unreadable } = resolveAccountKnowledge(rows)

  return {
    accountKnowledge: state && state.version !== 3 ? state : null,
    accountKnowledgeV3: state?.version === 3 ? state : null,
    accountKnowledgeLastUpdatedAt: state?.createdAt ?? null,
    unreadable,
  }
}
