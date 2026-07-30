import "server-only"

import { createHash } from "crypto"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import { SCORE_VERSION } from "./score-config"
import type { AccountScoreContext, AccountScoreResult, ScoreTriggerSource } from "./types"

export interface PersistAccountScoreRunParams {
  companyId: string
  context: AccountScoreContext
  result: AccountScoreResult
  triggerSource: ScoreTriggerSource
}

export interface PersistedAccountScoreRun {
  runId: string
  calculatedAt: string
}

// ADR-0011 Lot 3 — persiste un run + ses composants. Append-only : chaque
// appel insère une nouvelle ligne (account_score_runs.id), jamais un UPDATE
// (cf. commentaire de la migration 044_account_score_schema.sql).
export async function persistAccountScoreRun(params: PersistAccountScoreRunParams): Promise<PersistedAccountScoreRun> {
  const { companyId, context, result, triggerSource } = params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const inputHash = createHash("sha256").update(JSON.stringify(context)).digest("hex")

  const { data: run, error: runError } = await supabase
    .from("account_score_runs")
    .insert({
      company_id: companyId,
      score_version: SCORE_VERSION,
      score_value: result.scoreValue,
      score_band: result.scoreBand,
      confidence_score: result.confidenceScore,
      lifecycle_context: result.lifecycleContext,
      data_cutoff_at: context.dataCutoffAt,
      trigger_source: triggerSource,
      triggered_by: user?.id ?? null,
      input_hash: inputHash,
      input_snapshot: context as unknown as Json,
      summary: result.summary as unknown as Json,
    })
    .select("id,calculated_at")
    .single()

  if (runError || !run) {
    throw new Error(`Échec de la persistance du run de score : ${runError?.message}`)
  }

  const componentsPayload = result.components.map((c) => ({
    score_run_id: run.id,
    component_key: c.componentKey,
    component_label: c.componentLabel,
    raw_value_json: c.rawValueJson as unknown as Json,
    normalized_score: c.normalizedScore,
    weight: c.weight,
    lifecycle_multiplier: c.lifecycleMultiplier,
    weighted_contribution: c.weightedContribution,
    confidence: c.confidence,
    freshness_status: c.freshnessStatus,
    explanation: c.explanation,
    evidence_refs: c.evidenceRefs as unknown as Json,
  }))

  const { error: componentsError } = await supabase.from("account_score_components").insert(componentsPayload)

  if (componentsError) {
    throw new Error(`Échec de la persistance des composants de score : ${componentsError.message}`)
  }

  return { runId: run.id as string, calculatedAt: run.calculated_at as string }
}
