/**
 * Construction de l'enveloppe n8n et du snapshot persisté — ADR-0020 §3 et D (traçabilité).
 *
 * Fonctions PURES, extraites de la gateway pour être testables : la route reste un
 * enchaînement lisible (authentifier → résoudre → assembler → déclencher) et ne crée
 * AUCUN second chemin de lancement (§5.2).
 *
 * ── LA SÉPARATION QUI COMPTE ─────────────────────────────────────────────────────
 * `buildMissionEnvelope` porte le prompt, donc le contenu du corpus : il part vers n8n.
 * `buildMissionInputSnapshot` porte la trace, donc des références, des titres et une
 * provenance : lui seul est persisté dans `ai_intelligence_runs.input_snapshot` (P2).
 * Les deux ne doivent jamais être confondus — d'où deux fonctions plutôt qu'un objet
 * unique dans lequel il serait facile de se tromper de champ.
 */

import type { MissionRunEnvelope, N8nEntityType } from "@/lib/n8n/types"
import type { CorpusSelector, MissionSpec, ResolvedCorpus } from "../domain/mission-contracts"

export type MissionRunEntity = {
  entityType: N8nEntityType
  entityId: string
  companyId: string | null
}

/**
 * L'entité pivot du run est déduite du corpus RÉSOLU, jamais du corps de la requête.
 * Un `companyId` envoyé par le navigateur n'atteint donc jamais `ai_intelligence_runs` :
 * si le compte n'appartient pas au workspace de l'appelant, le provider ne rend aucune
 * ligne `companies` et le run reste rattaché au workspace.
 */
export function resolveMissionRunEntity(
  corpus: ResolvedCorpus,
  workspaceId: string,
): MissionRunEntity {
  const companyItem = corpus.items.find(
    (item) => item.ref.kind === "account_context" && item.ref.table === "companies",
  )
  if (companyItem) {
    return { entityType: "company", entityId: companyItem.ref.id, companyId: companyItem.ref.id }
  }
  return { entityType: "workspace", entityId: workspaceId, companyId: null }
}

export function buildMissionEnvelope(
  spec: MissionSpec,
  corpus: ResolvedCorpus,
  prompts: { systemPrompt: string; userPrompt: string },
  requestedAt: string,
): MissionRunEnvelope {
  return {
    schemaVersion: 1,
    missionSlug: spec.slug,
    missionVersion: spec.version,
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt,
    model: spec.model,
    corpus: {
      kept: corpus.stats.kept,
      requested: corpus.stats.requested,
      dropped: corpus.stats.dropped,
      totalChars: corpus.stats.totalChars,
    },
    budget: spec.corpus.budget,
    requestedAt,
  }
}

/**
 * Ce qui est écrit dans `ai_intelligence_runs.input_snapshot`.
 *
 * `trace` est reprise TELLE QUELLE : L3 doit pouvoir reconstituer un `SourceRef`
 * (`ref` + `title` + `provenance`) à partir du seul identifiant rendu par le LLM.
 * L'appauvrir — ne garder que les `ref`, ou ne tracer que les éléments conservés —
 * casserait le callback. Aucun `content` n'y figure (P2).
 */
export function buildMissionInputSnapshot(
  spec: MissionSpec,
  corpus: ResolvedCorpus,
  selectors: CorpusSelector[],
  requestedAt: string,
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    missionSlug: spec.slug,
    missionVersion: spec.version,
    requestedAt,
    selectors,
    budget: spec.corpus.budget,
    stats: corpus.stats,
    trace: corpus.trace,
  }
}

/** Ce que porte `ai_intelligence_runs.config`, à côté de `workflowId` (ADR-0020 §3). */
export function buildMissionRunConfig(spec: MissionSpec): Record<string, unknown> {
  return {
    missionSlug: spec.slug,
    missionVersion: spec.version,
    corpusBudget: spec.corpus.budget,
  }
}
