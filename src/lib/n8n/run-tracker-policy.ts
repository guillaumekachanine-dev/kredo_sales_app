// ─── Politique de suivi d'un run n8n ────────────────────────────────────────
// Module PUR (aucun accès réseau, aucun hook) : c'est ici que vivent les
// décisions du suivi — quand un run est terminé, quand relancer, quand
// abandonner. Séparé du hook pour être testable sans navigateur ni Supabase.
//
// Pourquoi un suivi par relance et pas seulement du Realtime : un run dure de
// quelques secondes à plusieurs minutes. Sur cette durée, un WebSocket peut
// être coupé (réseau d'entreprise, proxy), l'onglet peut être mis en veille par
// le navigateur, ou l'événement peut tomber pendant la fenêtre entre la réponse
// 202 du déclenchement et l'ouverture effective du canal. Le Realtime reste un
// accélérateur ; la relance périodique est ce qui garantit le résultat.

export type TrackedRunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled"

export const RUN_TRACKER_DEFAULTS = {
  /** Cadence de départ. Un run court est ainsi vu comme quasi instantané. */
  basePollIntervalMs: 4_000,
  /**
   * Après ce nombre de sondages (≈ 1 min à 4 s), la cadence est divisée par
   * deux : passé la première minute, une seconde de latence supplémentaire ne
   * se voit pas, alors que le trafic inutile, lui, s'accumule.
   */
  slowdownAfterAttempts: 15,
  slowPollIntervalMs: 8_000,
  /** Au-delà, on cesse de sonder et on le dit — jamais de spinner éternel. */
  timeoutMs: 300_000,
} as const

const TERMINAL_RUN_STATUSES: ReadonlySet<string> = new Set(["succeeded", "failed", "cancelled"])

export function isTerminalRunStatus(status: string | null | undefined): boolean {
  return typeof status === "string" && TERMINAL_RUN_STATUSES.has(status)
}

export type TrackedRunRow = {
  status: string | null
  error_message: string | null
}

export type TrackedResultRow = {
  id: string
  status: string | null
  result_type: string | null
}

export type RunOutcome =
  | { settled: false }
  | { settled: true; outcome: "succeeded"; resultId: string | null; message: null }
  | { settled: true; outcome: "failed"; resultId: string | null; message: string }

const DEFAULT_FAILURE_MESSAGE = "La génération a échoué."

/**
 * Décide de l'état d'un run à partir de la ligne de run ET de ses résultats.
 *
 * Les deux sources sont consultées parce qu'aucune n'est fiable seule :
 * - le résultat peut être écrit alors que la mise à jour du statut du run a
 *   échoué (elle est non bloquante côté callback, par conception) ;
 * - le run peut échouer sans qu'aucun résultat ne soit écrit (artefact refusé
 *   par la validation applicative, avant persistance).
 *
 * `resultType` restreint la reconnaissance au type attendu : un même run peut
 * porter plusieurs résultats, et un appelant qui attend un `account_knowledge`
 * ne doit pas être réveillé par un autre type.
 */
export function resolveRunOutcome(input: {
  run: TrackedRunRow | null
  results?: readonly TrackedResultRow[]
  resultType?: string
}): RunOutcome {
  const { run, resultType } = input
  const results = input.results ?? []
  const matching = resultType
    ? results.filter((row) => row.result_type === resultType)
    : results

  const succeededResult = matching.find((row) => row.status === "succeeded")
  if (succeededResult) {
    return { settled: true, outcome: "succeeded", resultId: succeededResult.id, message: null }
  }

  if (run?.status === "succeeded") {
    // Succès du run sans résultat du type attendu : on considère l'attente
    // terminée (l'appelant rafraîchira), sans prétendre disposer d'un résultat.
    return { settled: true, outcome: "succeeded", resultId: null, message: null }
  }

  if (run?.status === "failed" || run?.status === "cancelled") {
    return {
      settled: true,
      outcome: "failed",
      resultId: null,
      message: run.error_message?.trim() || DEFAULT_FAILURE_MESSAGE,
    }
  }

  const failedResult = matching.find((row) => row.status === "failed")
  if (failedResult) {
    return {
      settled: true,
      outcome: "failed",
      resultId: failedResult.id,
      message: run?.error_message?.trim() || DEFAULT_FAILURE_MESSAGE,
    }
  }

  return { settled: false }
}

/** Délai avant le prochain sondage, en fonction du nombre déjà effectués. */
export function nextPollDelayMs(
  attempt: number,
  config: {
    basePollIntervalMs?: number
    slowdownAfterAttempts?: number
    slowPollIntervalMs?: number
  } = {},
): number {
  const base = config.basePollIntervalMs ?? RUN_TRACKER_DEFAULTS.basePollIntervalMs
  const threshold = config.slowdownAfterAttempts ?? RUN_TRACKER_DEFAULTS.slowdownAfterAttempts
  const slow = config.slowPollIntervalMs ?? RUN_TRACKER_DEFAULTS.slowPollIntervalMs
  return attempt < threshold ? base : Math.max(base, slow)
}

export function hasTimedOut(startedAtMs: number, nowMs: number, timeoutMs: number): boolean {
  return nowMs - startedAtMs >= timeoutMs
}
