import type { CorpusSelector, MissionReportV1 } from "../domain/mission-contracts"

export const MONTHLY_WATCH_MISSION_ACTION_ID = "monthly_watch_mission" as const
export const MONTHLY_WATCH_MISSION_SLUG = "veille-analyse-mensuelle" as const
export const MISSION_REPORT_RESULT_TYPE = "mission_report" as const

export type MonthlyWatchMissionPayload = {
  missionSlug: typeof MONTHLY_WATCH_MISSION_SLUG
  selectors: [Extract<CorpusSelector, { kind: "veille_period" }>]
}

export type MissionLaunchResponse = {
  runId: string
  status: "queued"
}

export type MissionComposerStatus =
  | "idle"
  | "launching"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "timeout"

export type MissionComposerResult = MissionReportV1

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

export function monthToVeillePeriod(month: string): Extract<CorpusSelector, { kind: "veille_period" }> {
  const match = MONTH_PATTERN.exec(month)
  if (!match) throw new Error("La période doit être un mois au format AAAA-MM.")

  const year = Number(match[1])
  const monthNumber = Number(match[2])
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()

  return {
    kind: "veille_period",
    periodStart: `${month}-01`,
    periodEnd: `${month}-${String(lastDay).padStart(2, "0")}`,
  }
}

export function defaultMissionMonth(reference = new Date()): string {
  const previousMonth = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1))
  return previousMonth.toISOString().slice(0, 7)
}

export function buildMonthlyWatchMissionPayload(month: string): MonthlyWatchMissionPayload {
  return {
    missionSlug: MONTHLY_WATCH_MISSION_SLUG,
    selectors: [monthToVeillePeriod(month)],
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Pick<Response, "ok" | "json">>

export async function launchMonthlyWatchMission(
  month: string,
  fetcher: FetchLike = fetch,
): Promise<MissionLaunchResponse> {
  const response = await fetcher("/api/n8n/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildMonthlyWatchMissionPayload(month)),
  })
  const body = await response.json().catch(() => null) as { runId?: unknown; status?: unknown; error?: unknown } | null

  if (!response.ok) {
    throw new Error(typeof body?.error === "string" && body.error.trim()
      ? body.error
      : "Le lancement de l’analyse a échoué.")
  }
  if (typeof body?.runId !== "string" || !body.runId) {
    throw new Error("Le serveur n’a pas renvoyé d’identifiant de traitement.")
  }

  return { runId: body.runId, status: "queued" }
}
