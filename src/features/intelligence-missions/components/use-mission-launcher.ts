"use client"

import { useCallback, useState } from "react"

import { useRunTracker, type RunTrackerResult } from "@/lib/n8n/use-run-tracker"
import {
  MISSION_REPORT_RESULT_TYPE,
  launchMonthlyWatchMission,
  type MissionComposerResult,
  type MissionComposerStatus,
} from "./mission-composer-model"

export function useMissionLauncher() {
  const [runId, setRunId] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [result, setResult] = useState<RunTrackerResult<MissionComposerResult> | null>(null)

  const tracker = useRunTracker<MissionComposerResult>({
    runId,
    resultType: MISSION_REPORT_RESULT_TYPE,
    withResult: true,
    onSucceeded: setResult,
  })

  const launch = useCallback(async (month: string) => {
    setLaunching(true)
    setLaunchError(null)
    setResult(null)
    setRunId(null)
    try {
      const response = await launchMonthlyWatchMission(month)
      setRunId(response.runId)
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : "Le lancement de l’analyse a échoué.")
    } finally {
      setLaunching(false)
    }
  }, [])

  const reset = useCallback(() => {
    setRunId(null)
    setLaunchError(null)
    setResult(null)
    setLaunching(false)
  }, [])

  let status: MissionComposerStatus = "idle"
  if (launching) status = "launching"
  else if (launchError) status = "failed"
  else if (tracker.phase === "succeeded") status = "succeeded"
  else if (tracker.phase === "failed") status = "failed"
  else if (tracker.phase === "timeout") status = "timeout"
  else if (runId && tracker.runStatus === "running") status = "running"
  else if (runId) status = "queued"

  return {
    runId,
    status,
    result: result?.contentJson ?? null,
    errorMessage: launchError ?? tracker.errorMessage,
    launch,
    reset,
  }
}
