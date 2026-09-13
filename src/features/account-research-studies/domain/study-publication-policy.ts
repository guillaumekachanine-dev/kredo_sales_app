import { parseSourceRegistryOutput } from "@/features/source-management/domain/source-registry-output"
import { validateStudyKnowledge } from "./validate-study-knowledge"
import type { StudyProducer } from "./study-contracts"

export type StudyPublicationPolicyResult =
  | { ok: true }
  | { ok: false; reason: string }

export type ValidatePublicationPolicyInput = {
  producer: StudyProducer
  status: string
  publishedAt: string | null
  knowledgeJson: unknown
  sourcesRegistryJson: unknown
}

/**
 * Valide les prérequis métier stricts à la publication d'une étude selon son producteur.
 *
 * Règles communes :
 * - Étude au statut 'ready' et non encore publiée.
 * - `knowledgeJson` valide selon `validateStudyKnowledge()`.
 * - Intégrité textuelle démontrée (`coverage.text.identical === true`).
 * - Registre de sources présent (`sourcesRegistryJson`).
 *
 * Spécificités Deep Research (`chatgpt_deep_research`) :
 * - Registre E3 pleinement importable (`coverage.registry.importable === true`).
 * - Schéma E3 valide (`parseSourceRegistryOutput(sourcesRegistryJson).ok === true`).
 *
 * Spécificités ChatGPT Work (`chatgpt_work`) :
 * - Cohérence producteur (`knowledge.study.producer === 'chatgpt_work'`).
 * - Aucune référence source orpheline (`coverage.statements.unresolved_source_refs === 0`).
 * - `coverage.registry.importable` peut être `false` (les qualifications E3 manquantes
 *   ne sont pas inventées, la distribution vers Gestion des sources est différée au Lot 3).
 */
export function validateStudyPublicationPolicy(
  input: ValidatePublicationPolicyInput,
): StudyPublicationPolicyResult {
  const { producer, status, publishedAt, knowledgeJson, sourcesRegistryJson } = input

  if (status !== "ready" || publishedAt) {
    return {
      ok: false,
      reason: "Seule une étude convertie et non encore publiée peut être publiée.",
    }
  }

  const knowledge = validateStudyKnowledge(knowledgeJson)
  if (!knowledge.ok) {
    return {
      ok: false,
      reason: `Publication bloquée : briques invalides (${knowledge.issues[0] ?? "erreur inconnue"}).`,
    }
  }

  if (!knowledge.value.coverage.text.identical) {
    return {
      ok: false,
      reason: "Publication bloquée : l’intégrité du texte source n’est pas démontrée.",
    }
  }

  if (!sourcesRegistryJson || typeof sourcesRegistryJson !== "object") {
    return {
      ok: false,
      reason: "Publication bloquée : registre de sources absent.",
    }
  }

  if (producer === "chatgpt_work") {
    if (knowledge.value.study.producer !== "chatgpt_work") {
      return {
        ok: false,
        reason: "Publication bloquée : incohérence de producteur entre l'enregistrement et l'étude.",
      }
    }

    if (knowledge.value.coverage.statements.unresolved_source_refs > 0) {
      return {
        ok: false,
        reason: `Publication bloquée : ${knowledge.value.coverage.statements.unresolved_source_refs} référence(s) source orpheline(s).`,
      }
    }

    // Pour ChatGPT Work, la publication de l'étude est permise même si
    // le registre E3 n'est pas encore importable dans Gestion des sources.
    return { ok: true }
  }

  // Deep Research (strict E3)
  if (!knowledge.value.coverage.registry.importable) {
    return {
      ok: false,
      reason: "Publication bloquée : le registre de sources E3 n’est pas importable.",
    }
  }

  const registry = parseSourceRegistryOutput(sourcesRegistryJson)
  if (!registry.ok) {
    return {
      ok: false,
      reason: `Publication bloquée : registre E3 invalide (${registry.errors[0]?.message ?? "erreur inconnue"}).`,
    }
  }

  return { ok: true }
}
