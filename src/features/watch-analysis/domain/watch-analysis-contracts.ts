// Validation du contrat V2 « Analyse à la demande » (Veille).
// Pure — aucune dépendance externe, aucune I/O. Miroir de
// `content-collections-contracts.ts` (domain = types/validation, data = I/O).
//
// docs/FEATURES/veille_signaux_actualites/analyse_a_la_demande/01-ARCHITECTURE-ET-CONTRATS.md §4
// Règles : schemaVersion 2, triggerMode "manual_custom", intention non vide,
// 1 à 3 groupes de sources, aucun groupe vide, IDs non vides et dédupliqués
// à l'intérieur d'un même groupe. La déduplication ENTRE groupes (une même
// référence choisie deux fois) est un problème de résolution, pas de forme —
// elle est traitée par `resolveWatchAnalysisSources`, pas ici.

import type { WatchAnalysisInputV2, WatchAnalysisSource } from "@/lib/n8n/types"

export const MIN_WATCH_ANALYSIS_SOURCE_GROUPS = 1
export const MAX_WATCH_ANALYSIS_SOURCE_GROUPS = 3

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function dedupeTrimmed(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim())))
}

function validateSource(raw: unknown, index: number): ValidationResult<WatchAnalysisSource> {
  const label = `Groupe de sources #${index + 1}`

  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: `${label} invalide.` }
  }
  const source = raw as Record<string, unknown>

  switch (source.kind) {
    case "digest": {
      if (!isNonEmptyString(source.digestId)) {
        return { ok: false, error: `${label} (digest) : digestId manquant ou vide.` }
      }
      if (source.articleIds !== undefined) {
        if (!isStringArray(source.articleIds) || source.articleIds.some((id) => !isNonEmptyString(id))) {
          return { ok: false, error: `${label} (digest) : articleIds doit être un tableau d'identifiants non vides.` }
        }
        if (source.articleIds.length === 0) {
          return { ok: false, error: `${label} (digest) : articleIds ne doit pas être vide s'il est fourni.` }
        }
        return {
          ok: true,
          value: { kind: "digest", digestId: source.digestId.trim(), articleIds: dedupeTrimmed(source.articleIds) },
        }
      }
      return { ok: true, value: { kind: "digest", digestId: source.digestId.trim() } }
    }

    case "account_signals": {
      if (!isStringArray(source.signalIds) || source.signalIds.length === 0 || source.signalIds.some((id) => !isNonEmptyString(id))) {
        return { ok: false, error: `${label} (account_signals) : signalIds doit contenir au moins un identifiant non vide.` }
      }
      return { ok: true, value: { kind: "account_signals", signalIds: dedupeTrimmed(source.signalIds) } }
    }

    case "intelligence_documents": {
      if (
        !isStringArray(source.documentIds) ||
        source.documentIds.length === 0 ||
        source.documentIds.some((id) => !isNonEmptyString(id))
      ) {
        return {
          ok: false,
          error: `${label} (intelligence_documents) : documentIds doit contenir au moins un identifiant non vide.`,
        }
      }
      return { ok: true, value: { kind: "intelligence_documents", documentIds: dedupeTrimmed(source.documentIds) } }
    }

    case "knowledge_collection": {
      if (!isNonEmptyString(source.collectionId)) {
        return { ok: false, error: `${label} (knowledge_collection) : collectionId manquant ou vide.` }
      }
      return { ok: true, value: { kind: "knowledge_collection", collectionId: source.collectionId.trim() } }
    }

    default:
      return { ok: false, error: `${label} : kind de source inconnu.` }
  }
}

/**
 * Valide la FORME du contrat V2 envoyé par le navigateur. Ne vérifie jamais
 * l'accessibilité des identifiants (RLS/workspace) — c'est le rôle de
 * `resolveWatchAnalysisSources`, qui reçoit en entrée le résultat `ok: true`
 * de cette fonction.
 */
export function validateWatchAnalysisInput(raw: unknown): ValidationResult<WatchAnalysisInputV2> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Entrée invalide." }
  }
  const input = raw as Record<string, unknown>

  if (input.schemaVersion !== 2) {
    return { ok: false, error: "schemaVersion doit être 2." }
  }
  if (input.triggerMode !== "manual_custom") {
    return { ok: false, error: 'triggerMode doit être "manual_custom".' }
  }
  if (!isNonEmptyString(input.intention)) {
    return { ok: false, error: "L'intention est obligatoire." }
  }
  if (!isNonEmptyString(input.requestedAt)) {
    return { ok: false, error: "requestedAt est obligatoire." }
  }
  if (
    !Array.isArray(input.sources) ||
    input.sources.length < MIN_WATCH_ANALYSIS_SOURCE_GROUPS ||
    input.sources.length > MAX_WATCH_ANALYSIS_SOURCE_GROUPS
  ) {
    return {
      ok: false,
      error: `Le nombre de groupes de sources doit être compris entre ${MIN_WATCH_ANALYSIS_SOURCE_GROUPS} et ${MAX_WATCH_ANALYSIS_SOURCE_GROUPS}.`,
    }
  }

  const sources: WatchAnalysisSource[] = []
  for (let index = 0; index < input.sources.length; index += 1) {
    const result = validateSource(input.sources[index], index)
    if (!result.ok) return result
    sources.push(result.value)
  }

  return {
    ok: true,
    value: {
      schemaVersion: 2,
      triggerMode: "manual_custom",
      intention: (input.intention as string).trim(),
      requestedAt: (input.requestedAt as string).trim(),
      sources,
    },
  }
}
