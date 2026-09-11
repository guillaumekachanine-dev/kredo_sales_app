import "server-only"

// ─── Portail d'entrée — artefact account_knowledge produit HORS n8n ─────────
//
// Un LLM de recherche approfondie externe (Gemini/ChatGPT Deep Research), cadré par
// `docs/FEATURES/cockpit_intelligence_features/account_intelligence/09-PROJECT-INSTRUCTIONS-LLM-EXTERNE.md`,
// produit directement le JSON V4. Ce module le fait passer par EXACTEMENT la même
// porte que `/api/n8n/callback` (`ingestAccountKnowledgeArtifact` — mêmes gates :
// INV-1/INV-2, hypothesis non chiffrée, frontière tenant sur les UUID de sources) puis
// persiste avec les mêmes fonctions (`createRun`/`saveResult`/`updateRunStatus`).
//
// Ce qui distingue un run importé d'un run n8n :
//   - `trigger_source: "manual_import"` — jamais "ui"/"cron" ;
//   - aucun `n8nExecutionId`/`n8nWorkflowId` : il n'y a pas d'exécution n8n réelle,
//     le lien « Ouvrir dans n8n » du drill-down reste donc muet, à raison ;
//   - aucun compteur de tokens déclaré : on ne sait pas combien le producteur externe
//     en a consommé — un `0` mentirait par excès de précision. `v_ai_result_costs`
//     affichera `tokens_missing`, ce qui est la vérité, pas une absence à cacher.

import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import type { N8nCallbackPayload } from "@/lib/n8n/types"
import { createRun, saveResult, updateRunStatus } from "@/lib/n8n/runs"
import { ACCOUNT_KNOWLEDGE_RESULT_TYPE } from "./account-intelligence-contracts"
import { ingestAccountKnowledgeArtifact } from "./account-knowledge-ingest"
import type { ValidationIssue } from "./intelligence-validators"

export type ImportExternalAccountKnowledgeParams = {
  workspaceId: string
  companyId: string
  ownerId: string
  contentJson: unknown
  /** Texte libre — "chatgpt-deep-research", "gemini-deep-research"… */
  modelUsed: string
}

export type ImportExternalAccountKnowledgeResult =
  | { ok: true; runId: string; version: 1 | 2 | 3 | 4 }
  | { ok: false; error: string; issues: ValidationIssue[] }

export async function importExternalAccountKnowledge(
  supabase: SupabaseClient<Database>,
  params: ImportExternalAccountKnowledgeParams,
): Promise<ImportExternalAccountKnowledgeResult> {
  const { workspaceId, companyId, ownerId, contentJson, modelUsed } = params

  // Le client passé ici sert UNIQUEMENT à la vérification de frontière tenant des
  // sources V1/V2/V4 (SELECT autorisé par la policy RLS de `intelligence_sources`).
  // Les écritures (`createRun`/`saveResult`/`updateRunStatus`, ci-dessous) passent
  // toutes par le client service-role interne à `@/lib/n8n/runs` — même partition
  // des responsabilités que le callback n8n.
  const ingest = await ingestAccountKnowledgeArtifact(supabase, {
    workspaceId,
    companyId,
    contentJson,
  })

  if (!ingest.ok) {
    return { ok: false, error: ingest.error, issues: ingest.issues }
  }

  const runId = await createRun({
    workflowId: "intel-030-account-knowledge",
    runType: "intel-030-account-knowledge",
    entityType: "company",
    entityId: companyId,
    companyId,
    workspaceId,
    userId: ownerId,
    input: {},
    inputSnapshot: {
      source: "external_llm_import",
      modelUsed,
      importedAt: new Date().toISOString(),
    },
    triggerSource: "manual_import",
  })

  await updateRunStatus(runId, "succeeded", { phase: 1 })

  const payload: N8nCallbackPayload = {
    runId,
    phase: 1,
    resultType: ACCOUNT_KNOWLEDGE_RESULT_TYPE,
    status: "succeeded",
    contentJson: ingest.content as unknown as N8nCallbackPayload["contentJson"],
    modelProvider: "external_llm",
    modelUsed,
  }

  await saveResult(runId, companyId, workspaceId, ownerId, payload)

  return { ok: true, runId, version: ingest.version }
}
