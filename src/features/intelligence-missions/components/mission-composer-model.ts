import type { AccountValue } from "@/components/missions/AccountCombobox"
import type { IntelligenceEntityContext } from "@/hooks/use-intelligence-context"
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

export type MissionLaunchInput =
  | { kind: "month"; month: string }
  | { kind: "account"; companyId: string }

export type MissionComposerConfig = {
  /** Slug catalogue — la seule chose envoyée au serveur avec les sélecteurs. */
  missionSlug: string
  /** Titre affiché en en-tête du composeur (Desktop ET Mobile). */
  label: string
  /** Phrase descriptive sous le titre — copie UI, n'a pas à recopier mot pour mot
   *  `MissionSpec.description` du catalogue (registres différents : l'un nominal
   *  pour un catalogue, l'autre pour un utilisateur qui va cliquer "Lancer"). */
  description: string
  /** Forme d'entrée attendue par le composeur. */
  inputKind: MissionLaunchInput["kind"]
  /** Construit les sélecteurs à partir de l'entrée validée du formulaire. */
  buildSelectors: (input: MissionLaunchInput) => CorpusSelector[]
}

/**
 * Résout la sélection initiale de compte à partir du contexte d'entité global.
 * Fonction pure sans dépendance React, testable unitairement en .test.ts.
 */
export function resolveInitialAccountSelection(
  entityContext: IntelligenceEntityContext | null,
): AccountValue | null {
  if (!entityContext) return null
  if (entityContext.entityType !== "company") return null
  if (!entityContext.entityId || !entityContext.entityId.trim()) return null
  return {
    id: entityContext.entityId,
    name: entityContext.label ?? "",
    isNew: false,
  }
}

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

/**
 * Calcule les dates de début et de fin de mois UTC à partir d'un mois au format "AAAA-MM".
 * Helper partagé entre les différents constructeurs de sélecteurs temporels.
 */
function computeMonthBoundaries(month: string): { periodStart: string; periodEnd: string } {
  const match = MONTH_PATTERN.exec(month)
  if (!match) throw new Error("La période doit être un mois au format AAAA-MM.")

  const year = Number(match[1])
  const monthNumber = Number(match[2])
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()

  return {
    periodStart: `${month}-01`,
    periodEnd: `${month}-${String(lastDay).padStart(2, "0")}`,
  }
}

export function monthToVeillePeriod(month: string): Extract<CorpusSelector, { kind: "veille_period" }> {
  const { periodStart, periodEnd } = computeMonthBoundaries(month)
  return {
    kind: "veille_period",
    periodStart,
    periodEnd,
  }
}

export function monthToDeliveryPeriod(month: string): Extract<CorpusSelector, { kind: "delivery_period" }> {
  const { periodStart, periodEnd } = computeMonthBoundaries(month)
  return {
    kind: "delivery_period",
    periodStart,
    periodEnd,
  }
}

export function monthToProspectionWindow(month: string): Extract<CorpusSelector, { kind: "prospection_window" }> {
  const { periodStart, periodEnd } = computeMonthBoundaries(month)
  return {
    kind: "prospection_window",
    periodStart,
    periodEnd,
  }
}

export function monthToStaffingHorizon(month: string): Extract<CorpusSelector, { kind: "staffing_horizon" }> {
  const { periodStart, periodEnd } = computeMonthBoundaries(month)
  return {
    kind: "staffing_horizon",
    periodStart,
    periodEnd,
  }
}

export function monthToPipelinePeriod(month: string): Extract<CorpusSelector, { kind: "pipeline_period" }> {
  const match = MONTH_PATTERN.exec(month)
  if (!match) throw new Error("La période doit être un mois au format AAAA-MM.")

  const year = Number(match[1])
  const monthNumber = Number(match[2])
  const quarterStartMonth = Math.floor((monthNumber - 1) / 3) * 3 + 1
  const quarterEndMonth = quarterStartMonth + 2
  const lastDay = new Date(Date.UTC(year, quarterEndMonth, 0)).getUTCDate()

  const periodStart = `${year}-${String(quarterStartMonth).padStart(2, "0")}-01`
  const periodEnd = `${year}-${String(quarterEndMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

  return {
    kind: "pipeline_period",
    periodStart,
    periodEnd,
  }
}

export function monthToHiringPeriod(month: string): Extract<CorpusSelector, { kind: "hiring_period" }> {
  const { periodStart, periodEnd } = computeMonthBoundaries(month)
  return {
    kind: "hiring_period",
    periodStart,
    periodEnd,
  }
}

export function defaultMissionMonth(reference = new Date()): string {
  const previousMonth = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1))
  return previousMonth.toISOString().slice(0, 7)
}

export function buildMissionLaunchPayload(
  missionSlug: string,
  selectors: CorpusSelector[],
): { missionSlug: string; selectors: CorpusSelector[] } {
  return { missionSlug, selectors }
}

export function buildMonthlyWatchMissionPayload(month: string): MonthlyWatchMissionPayload {
  return {
    missionSlug: MONTHLY_WATCH_MISSION_SLUG,
    selectors: [monthToVeillePeriod(month)],
  }
}

type FetchLike = (input: string, init: RequestInit) => Promise<Pick<Response, "ok" | "json">>

export async function launchMission(
  missionSlug: string,
  selectors: CorpusSelector[],
  fetcher: FetchLike = fetch,
): Promise<MissionLaunchResponse> {
  const response = await fetcher("/api/n8n/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildMissionLaunchPayload(missionSlug, selectors)),
  })
  const body = (await response.json().catch(() => null)) as {
    runId?: unknown
    status?: unknown
    error?: unknown
  } | null

  if (!response.ok) {
    throw new Error(
      typeof body?.error === "string" && body.error.trim()
        ? body.error
        : "Le lancement de l’analyse a échoué.",
    )
  }
  if (typeof body?.runId !== "string" || !body.runId) {
    throw new Error("Le serveur n’a pas renvoyé d’identifiant de traitement.")
  }

  return { runId: body.runId, status: "queued" }
}

export async function launchMonthlyWatchMission(
  month: string,
  fetcher: FetchLike = fetch,
): Promise<MissionLaunchResponse> {
  return launchMission(MONTHLY_WATCH_MISSION_SLUG, [monthToVeillePeriod(month)], fetcher)
}

export const VEILLE_MISSION_COMPOSER_CONFIG: MissionComposerConfig = {
  missionSlug: MONTHLY_WATCH_MISSION_SLUG,
  label: "Analyse mensuelle de la veille",
  description:
    "Identifier les tendances, signaux faibles, évolutions réglementaires, opportunités, risques et actions prioritaires d'une période de veille.",
  inputKind: "month",
  buildSelectors: (input) => {
    if (input.kind !== "month") {
      throw new Error(`Entrée invalide pour la mission "${MONTHLY_WATCH_MISSION_SLUG}" : attendu "month", reçu "${input.kind}".`)
    }
    return [monthToVeillePeriod(input.month)]
  },
}

export const RENTABILITE_MISSION_COMPOSER_CONFIG: MissionComposerConfig = {
  missionSlug: "rentabilite-portefeuille",
  label: "Rentabilité du portefeuille",
  description:
    "Analyser les marges réelles, identifier les dérives par mission, client ou consultant et dégager les actions de redressement de la rentabilité.",
  inputKind: "month",
  buildSelectors: (input) => {
    if (input.kind !== "month") {
      throw new Error(`Entrée invalide pour la mission "rentabilite-portefeuille" : attendu "month", reçu "${input.kind}".`)
    }
    return [monthToDeliveryPeriod(input.month)]
  },
}

export const ACTIVATION_PORTEFEUILLE_MISSION_COMPOSER_CONFIG: MissionComposerConfig = {
  missionSlug: "activation-portefeuille",
  label: "Activation du portefeuille",
  description:
    "Identifier les comptes prioritaires à relancer selon les signaux d'achat, la fraîcheur relationnelle et les enjeux cartographiés.",
  inputKind: "month",
  buildSelectors: (input) => {
    if (input.kind !== "month") {
      throw new Error(`Entrée invalide pour la mission "activation-portefeuille" : attendu "month", reçu "${input.kind}".`)
    }
    return [monthToProspectionWindow(input.month)]
  },
}

export const CAPACITE_STAFFING_MISSION_COMPOSER_CONFIG: MissionComposerConfig = {
  missionSlug: "capacite-staffing",
  label: "Capacité de staffing",
  description:
    "Anticiper qui se libère dans les 3 mois à venir et rapprocher ces disponibilités des besoins ouverts.",
  inputKind: "month",
  buildSelectors: (input) => {
    if (input.kind !== "month") {
      throw new Error(`Entrée invalide pour la mission "capacite-staffing" : attendu "month", reçu "${input.kind}".`)
    }
    return [monthToStaffingHorizon(input.month)]
  },
}

export const REVUE_COMPTE_MISSION_COMPOSER_CONFIG: MissionComposerConfig = {
  missionSlug: "revue-compte-client",
  label: "Revue de compte client",
  description:
    "Dresser le bilan croisé de la relation client et de la rentabilité de la delivery pour identifier les opportunités et corriger les dérives.",
  inputKind: "account",
  buildSelectors: (input) => {
    if (input.kind !== "account") {
      throw new Error(
        `Entrée invalide pour la mission "revue-compte-client" : attendu "account", reçu "${input.kind}".`,
      )
    }
    return [
      { kind: "account_context", companyId: input.companyId },
      { kind: "account_delivery", companyId: input.companyId },
    ]
  },
}

export const POST_MORTEM_PIPELINE_MISSION_COMPOSER_CONFIG: MissionComposerConfig = {
  missionSlug: "post-mortem-commercial",
  label: "Post-mortem commercial",
  description:
    "Analyser les affaires gagnées et perdues du trimestre pour identifier les motifs récurrents de succès et d'échec.",
  inputKind: "month",
  buildSelectors: (input) => {
    if (input.kind !== "month") {
      throw new Error(
        `Entrée invalide pour la mission "post-mortem-commercial" : attendu "month", reçu "${input.kind}".`,
      )
    }
    return [monthToPipelinePeriod(input.month)]
  },
}

export const FUNNEL_RECRUTEMENT_MISSION_COMPOSER_CONFIG: MissionComposerConfig = {
  missionSlug: "funnel-recrutement",
  label: "Funnel & Délais Recrutement",
  description:
    "Analyser où le funnel de recrutement perd des candidats et repérer les délais anormaux entre étapes.",
  inputKind: "month",
  buildSelectors: (input) => {
    if (input.kind !== "month") {
      throw new Error(
        `Entrée invalide pour la mission "funnel-recrutement" : attendu "month", reçu "${input.kind}".`,
      )
    }
    return [monthToHiringPeriod(input.month)]
  },
}

/**
 * Une action du cockpit peut déclencher le composeur de mission plutôt que la rédaction
 * ou un rapport déterministe. Cette table est la SEULE source de vérité de ce mapping —
 * elle remplace la comparaison à un id unique (`MONTHLY_WATCH_MISSION_ACTION_ID`) qui ne
 * supportait qu'une mission à la fois.
 */
export const MISSION_COMPOSER_ACTION_CONFIGS: Record<string, MissionComposerConfig> = {
  [MONTHLY_WATCH_MISSION_ACTION_ID]: VEILLE_MISSION_COMPOSER_CONFIG,
  analyze_margins: RENTABILITE_MISSION_COMPOSER_CONFIG,
  prioritize_accounts: ACTIVATION_PORTEFEUILLE_MISSION_COMPOSER_CONFIG,
  forecast_availability: CAPACITE_STAFFING_MISSION_COMPOSER_CONFIG,
  review_account: REVUE_COMPTE_MISSION_COMPOSER_CONFIG,
  post_mortem_pipeline: POST_MORTEM_PIPELINE_MISSION_COMPOSER_CONFIG,
  analyze_hiring_delays: FUNNEL_RECRUTEMENT_MISSION_COMPOSER_CONFIG,
}

