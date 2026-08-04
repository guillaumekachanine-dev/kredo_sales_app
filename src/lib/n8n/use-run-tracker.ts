"use client"

// ─── Suivi unifié d'un run n8n ──────────────────────────────────────────────
// Un seul mécanisme pour tous les déclenchements de l'app, là où chaque écran
// avait le sien (11 fichiers, 17 souscriptions, autant de variantes).
//
// Principe : le Realtime est un ACCÉLÉRATEUR, la relance périodique est la
// GARANTIE. Un run dure de quelques secondes à plusieurs minutes ; sur cette
// durée un WebSocket peut être coupé, l'onglet mis en veille, ou l'événement
// tomber pendant la fenêtre entre la réponse 202 du déclenchement et
// l'ouverture effective du canal. Le suivi ne doit dépendre d'aucun de ces aléas.
//
// Coût maîtrisé — ce hook ne sonde QUE pendant qu'un run est en vol :
//   - une seule requête par sondage : la ligne de run et l'état de ses
//     résultats sont lus ensemble via l'embed PostgREST (FK run_id) ;
//   - `content_json` (jusqu'à ~15 Ko) n'est JAMAIS tiré par le sondage : il
//     n'est lu qu'une fois, au moment où le run aboutit ;
//   - cadence 4 s la première minute puis 8 s ;
//   - sondage suspendu quand l'onglet est caché, avec relecture immédiate au
//     retour — précisément le cas où le Realtime rate l'événement ;
//   - arrêt net au premier état terminal, et abandon explicite après 5 min.

import { useCallback, useEffect, useRef, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { ensureRealtimeAuth } from "@/lib/supabase/realtime-auth"
import {
  hasTimedOut,
  nextPollDelayMs,
  resolveRunOutcome,
  RUN_TRACKER_DEFAULTS,
  type TrackedResultRow,
  type TrackedRunRow,
} from "./run-tracker-policy"

export type RunTrackerPhase = "idle" | "tracking" | "succeeded" | "failed" | "timeout"

/** Ligne complète d'un résultat, lue une seule fois à l'aboutissement. */
export type RunTrackerResult<TContent = unknown, TQaFlags = unknown> = {
  id: string
  status: string
  resultType: string | null
  contentJson: TContent
  qaFlags: TQaFlags
  title: string | null
}

export type UseRunTrackerOptions<TContent = unknown, TQaFlags = unknown> = {
  /** `null` : rien n'est suivi, aucune requête n'est émise. */
  runId: string | null
  /** Restreint la reconnaissance du succès à ce `result_type`. */
  resultType?: string
  /** `false` si l'appelant n'a pas besoin du contenu (il rafraîchira le serveur). */
  withResult?: boolean
  onSucceeded?: (result: RunTrackerResult<TContent, TQaFlags> | null) => void
  /** `result` est fourni quand un résultat en échec a été persisté (qa_flags…). */
  onFailed?: (message: string, result: RunTrackerResult<TContent, TQaFlags> | null) => void
  onTimeout?: () => void
  /** Appelé une seule fois, au passage `queued` → `running`. */
  onRunning?: () => void
  pollIntervalMs?: number
  timeoutMs?: number
}

type RunWithResultsRow = TrackedRunRow & {
  ai_intelligence_results: TrackedResultRow[] | null
}

export function useRunTracker<TContent = unknown, TQaFlags = unknown>(
  options: UseRunTrackerOptions<TContent, TQaFlags>,
): { phase: RunTrackerPhase; errorMessage: string | null; runStatus: string | null; isTracking: boolean } {
  const { runId } = options

  // L'état est porté avec le runId auquel il se rapporte, et réinitialisé
  // PENDANT LE RENDU quand le runId change — motif recommandé pour un état
  // dérivé d'une prop. Le faire dans un effet provoquerait un rendu en cascade
  // et laisserait, le temps d'une image, l'état du run précédent à l'écran.
  const [state, setState] = useState<{
    runId: string | null
    phase: RunTrackerPhase
    errorMessage: string | null
    /** Dernier statut brut connu du run — `queued` et `running` sont distincts
     *  côté affichage (« en file » / « en cours »), là où `phase` les confond. */
    runStatus: string | null
  }>({ runId, phase: runId ? "tracking" : "idle", errorMessage: null, runStatus: null })

  if (state.runId !== runId) {
    setState({ runId, phase: runId ? "tracking" : "idle", errorMessage: null, runStatus: null })
  }

  // Stable : l'effet de suivi en dépend, et une identité changeante le ferait
  // re-souscrire à chaque rendu du parent.
  const setOutcome = useCallback((phase: RunTrackerPhase, errorMessage: string | null) => {
    setState((current) => (current.runId === null ? current : { ...current, phase, errorMessage }))
  }, [])

  const setRunStatus = useCallback((runStatus: string | null) => {
    setState((current) =>
      current.runId === null || current.runStatus === runStatus ? current : { ...current, runStatus },
    )
  }, [])

  // Les options (dont les callbacks) sont lues via une ref : les inclure en
  // dépendance ferait re-souscrire le canal à chaque rendu du parent, avec une
  // fenêtre d'événements perdus entre l'ancien et le nouveau canal.
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    if (!runId) return

    const supabase = createClient()
    const startedAtMs = Date.now()
    let attempt = 0
    let settled = false
    let disposed = false
    let signalledRunning = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    }

    /** Lecture unique du résultat complet, seulement à l'aboutissement. */
    const loadResult = async (resultId: string) => {
      const { data } = await supabase
        .from("ai_intelligence_results")
        .select("id,status,result_type,content_json,qa_flags,title")
        .eq("id", resultId)
        .maybeSingle()
      if (!data) return null
      return {
        id: data.id,
        status: data.status,
        resultType: data.result_type,
        contentJson: data.content_json as TContent,
        qaFlags: (data.qa_flags ?? []) as TQaFlags,
        title: data.title,
      } satisfies RunTrackerResult<TContent, TQaFlags>
    }

    const settleSucceeded = async (resultId: string | null) => {
      if (settled || disposed) return
      settled = true
      clearTimer()
      const wantsResult = optionsRef.current.withResult !== false
      const result = wantsResult && resultId ? await loadResult(resultId) : null
      if (disposed) return
      setOutcome("succeeded", null)
      optionsRef.current.onSucceeded?.(result)
    }

    const settleFailed = async (message: string, resultId: string | null) => {
      if (settled || disposed) return
      settled = true
      clearTimer()
      // Le résultat en échec porte les qa_flags, seule source du motif réel du
      // rejet : on le charge aussi, sinon l'utilisateur n'a qu'un message générique.
      const wantsResult = optionsRef.current.withResult !== false
      const result = wantsResult && resultId ? await loadResult(resultId) : null
      if (disposed) return
      setOutcome("failed", message)
      optionsRef.current.onFailed?.(message, result)
    }

    const settleTimeout = () => {
      if (settled || disposed) return
      settled = true
      clearTimer()
      setOutcome(
        "timeout",
        "Le traitement dépasse le délai habituel. Il continue côté serveur : recharge la page dans quelques minutes.",
      )
      optionsRef.current.onTimeout?.()
    }

    const check = async () => {
      if (settled || disposed) return

      // Une seule requête : la ligne de run + l'état de ses résultats via
      // l'embed (FK ai_intelligence_results.run_id). Volontairement sans
      // content_json, qui pèse jusqu'à ~15 Ko et n'a aucun intérêt tant que le
      // run n'a pas abouti.
      const { data, error } = await supabase
        .from("ai_intelligence_runs")
        .select("status,error_message,ai_intelligence_results(id,status,result_type)")
        .eq("id", runId)
        .maybeSingle<RunWithResultsRow>()

      if (disposed || settled) return

      // Une erreur réseau ponctuelle ne doit pas faire échouer le suivi : on
      // reprogramme, le prochain sondage tranchera.
      if (error) {
        schedule()
        return
      }

      setRunStatus(data?.status ?? null)
      if (!signalledRunning && data?.status === "running") {
        signalledRunning = true
        optionsRef.current.onRunning?.()
      }

      const outcome = resolveRunOutcome({
        run: data,
        results: data?.ai_intelligence_results ?? [],
        resultType: optionsRef.current.resultType,
      })

      if (!outcome.settled) {
        schedule()
        return
      }

      if (outcome.outcome === "succeeded") {
        void settleSucceeded(outcome.resultId)
      } else {
        void settleFailed(outcome.message, outcome.resultId)
      }
    }

    function schedule() {
      if (settled || disposed) return
      if (hasTimedOut(startedAtMs, Date.now(), optionsRef.current.timeoutMs ?? RUN_TRACKER_DEFAULTS.timeoutMs)) {
        settleTimeout()
        return
      }
      // Onglet caché : on ne sonde pas. Le retour à l'écran relance
      // immédiatement (handler ci-dessous), ce qui couvre le cas où le
      // navigateur a gelé l'onglet pendant tout le run.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return

      clearTimer()
      timer = setTimeout(() => {
        attempt += 1
        void check()
      }, nextPollDelayMs(attempt, { basePollIntervalMs: optionsRef.current.pollIntervalMs }))
    }

    const handleVisibility = () => {
      if (settled || disposed) return
      if (document.visibilityState === "visible") void check()
    }

    // Le Realtime ne fait que déclencher la même vérification : une seule
    // logique d'aboutissement, jamais une lecture du payload en parallèle qui
    // pourrait diverger de celle du sondage.
    //
    // `ensureRealtimeAuth` d'abord : un canal ouvert sans jeton utilisateur se
    // souscrit « avec succès » puis reste muet à jamais (cf. realtime-auth.ts).
    let channel: ReturnType<typeof supabase.channel> | null = null
    void (async () => {
      await ensureRealtimeAuth(supabase)
      if (disposed || settled) return
      channel = supabase
        .channel(`run-tracker-${runId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ai_intelligence_results", filter: `run_id=eq.${runId}` },
          () => void check(),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "ai_intelligence_runs", filter: `id=eq.${runId}` },
          () => void check(),
        )
        .subscribe()
    })()

    document.addEventListener("visibilitychange", handleVisibility)

    // Vérification immédiate : ferme la fenêtre entre la réponse 202 du
    // déclenchement et l'ouverture du canal, et couvre le cas d'un run déjà
    // terminé au moment où l'écran se monte.
    void check()

    return () => {
      disposed = true
      clearTimer()
      document.removeEventListener("visibilitychange", handleVisibility)
      if (channel) void supabase.removeChannel(channel)
    }
    // Volontairement keyé sur `runId` seul : voir la note sur `optionsRef`.
  }, [runId, setOutcome, setRunStatus])

  return {
    phase: state.phase,
    errorMessage: state.errorMessage,
    runStatus: state.runStatus,
    isTracking: state.phase === "tracking",
  }
}

/**
 * Garde anti-double-déclenchement, partagée par tous les écrans qui lancent un
 * run. `isBusy` est mis à jour de façon SYNCHRONE : deux clics rapprochés
 * liraient tous les deux un état React encore à « libre ».
 */
export function useSingleFlight() {
  const inFlightRef = useRef(false)

  const run = useCallback(async (task: () => Promise<void>) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      await task()
    } finally {
      inFlightRef.current = false
    }
  }, [])

  return run
}
