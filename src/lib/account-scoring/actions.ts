"use server"

import { revalidatePath } from "next/cache"
import { collectAccountScoreInput } from "./collect-account-score-input"
import { computeAccountScore } from "./compute-account-score"
import type { AccountScoreSummaryView } from "./get-account-score-summary"
import { persistAccountScoreRun } from "./persist-account-score-run"

// ADR-0011 Lot 3/4 — déclenchée par le bouton "Actualiser" de ScoreDetailModal
// (Lot 4). Recalcul manuel uniquement en V1 (pas de cron) — cf. ADR §6
// décision "recalcul manuel uniquement jusqu'à ce qu'on ait vu son
// comportement". Renvoie directement la forme AccountScoreSummaryView
// (identique à ce que get-account-score-summary.ts lit en base) pour que l'UI
// n'ait pas à jongler avec deux représentations différentes du même run.
export async function recomputeAccountScore(companyId: string): Promise<AccountScoreSummaryView> {
  const context = await collectAccountScoreInput(companyId)
  const result = computeAccountScore(context)
  const { runId, calculatedAt } = await persistAccountScoreRun({ companyId, context, result, triggerSource: "manual" })

  revalidatePath(`/prospection/accounts/${companyId}`)

  return {
    runId,
    scoreValue: result.scoreValue,
    scoreBand: result.scoreBand,
    confidenceScore: result.confidenceScore,
    lifecycleContext: result.lifecycleContext,
    calculatedAt,
    components: result.components.map((c) => ({
      componentKey: c.componentKey,
      componentLabel: c.componentLabel,
      normalizedScore: c.normalizedScore,
      weight: c.weight,
      lifecycleMultiplier: c.lifecycleMultiplier,
      weightedContribution: c.weightedContribution,
      confidence: c.confidence,
      freshnessStatus: c.freshnessStatus,
      explanation: c.explanation,
    })),
    summary: result.summary,
  }
}
