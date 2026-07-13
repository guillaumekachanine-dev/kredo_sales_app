import {
  WORKSPACE_DIAGNOSTIC_AXES,
  WORKSPACE_DIAGNOSTIC_SCHEMA_VERSION,
  WORKSPACE_DIAGNOSTIC_SEVERITIES,
  type WorkspaceDiagnostic,
  type WorkspaceDiagnosticAxis,
  type WorkspaceDiagnosticCorrelation,
  type WorkspaceDiagnosticEvidenceRef,
  type WorkspaceDiagnosticPriority,
  type WorkspaceDiagnosticSeverity,
  type WorkspaceDiagnosticStrength,
  type WorkspaceDiagnosticWatchItem,
} from "./workspace-diagnostic-types"

export type WorkspaceDiagnosticParseResult =
  | { ok: true; value: WorkspaceDiagnostic }
  | { ok: false; error: string }

interface WorkspaceDiagnosticParseOptions {
  allowMonoAxisCorrelations?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${path} doit être une chaîne non vide`)
  }
  return value.trim()
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined
  return requiredString(value, path)
}

function requiredArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} doit être un tableau`)
  return value
}

function parseStringArray(value: unknown, path: string): string[] {
  return requiredArray(value, path).map((item, index) => requiredString(item, `${path}[${index}]`))
}

function parseEvidenceRef(value: unknown, path: string): WorkspaceDiagnosticEvidenceRef {
  if (!isRecord(value)) throw new Error(`${path} doit être un objet`)
  return {
    metric: requiredString(value.metric, `${path}.metric`),
    value: requiredString(value.value, `${path}.value`),
  }
}

function parseAxes(value: unknown, path: string): WorkspaceDiagnosticAxis[] {
  const allowed = new Set<string>(WORKSPACE_DIAGNOSTIC_AXES)
  const axes = parseStringArray(value, path)
  if (axes.some((axis) => !allowed.has(axis))) {
    throw new Error(`${path} contient un axe inconnu`)
  }
  return [...new Set(axes)] as WorkspaceDiagnosticAxis[]
}

function parseSeverity(value: unknown, path: string): WorkspaceDiagnosticSeverity {
  const severity = requiredString(value, path)
  if (!(WORKSPACE_DIAGNOSTIC_SEVERITIES as readonly string[]).includes(severity)) {
    throw new Error(`${path} contient une sévérité inconnue`)
  }
  return severity as WorkspaceDiagnosticSeverity
}

function parseCorrelation(
  value: unknown,
  path: string,
  options: WorkspaceDiagnosticParseOptions,
): WorkspaceDiagnosticCorrelation {
  if (!isRecord(value)) throw new Error(`${path} doit être un objet`)
  const axes = parseAxes(value.axes, `${path}.axes`)
  if (!options.allowMonoAxisCorrelations && axes.length < 2) {
    throw new Error(`${path}.axes doit croiser au moins deux axes`)
  }
  const evidenceRefs = requiredArray(value.evidenceRefs, `${path}.evidenceRefs`)
    .map((item, index) => parseEvidenceRef(item, `${path}.evidenceRefs[${index}]`))
  if (evidenceRefs.length === 0) throw new Error(`${path}.evidenceRefs ne peut pas être vide`)

  return {
    id: requiredString(value.id, `${path}.id`),
    title: requiredString(value.title, `${path}.title`),
    narrative: requiredString(value.narrative, `${path}.narrative`),
    axes,
    severity: parseSeverity(value.severity, `${path}.severity`),
    evidenceRefs,
  }
}

function parsePriority(value: unknown, path: string): WorkspaceDiagnosticPriority {
  if (!isRecord(value)) throw new Error(`${path} doit être un objet`)
  if (value.rank !== 1 && value.rank !== 2 && value.rank !== 3) {
    throw new Error(`${path}.rank doit valoir 1, 2 ou 3`)
  }
  const relatedCorrelationIds = parseStringArray(
    value.relatedCorrelationIds,
    `${path}.relatedCorrelationIds`,
  )
  if (relatedCorrelationIds.length === 0) {
    throw new Error(`${path}.relatedCorrelationIds ne peut pas être vide`)
  }
  return {
    rank: value.rank,
    action: requiredString(value.action, `${path}.action`),
    rationale: requiredString(value.rationale, `${path}.rationale`),
    relatedCorrelationIds,
  }
}

function parseWatchItem(value: unknown, path: string): WorkspaceDiagnosticWatchItem {
  if (!isRecord(value)) throw new Error(`${path} doit être un objet`)
  return {
    signal: requiredString(value.signal, `${path}.signal`),
    horizon: requiredString(value.horizon, `${path}.horizon`),
    triggerCondition: requiredString(value.triggerCondition, `${path}.triggerCondition`),
  }
}

function parseStrength(value: unknown, path: string): WorkspaceDiagnosticStrength {
  if (!isRecord(value)) throw new Error(`${path} doit être un objet`)
  return {
    observation: requiredString(value.observation, `${path}.observation`),
    sustainAction: optionalString(value.sustainAction, `${path}.sustainAction`),
  }
}

export function parseWorkspaceDiagnostic(
  input: unknown,
  options: WorkspaceDiagnosticParseOptions = {},
): WorkspaceDiagnosticParseResult {
  try {
    if (!isRecord(input)) throw new Error("Le diagnostic doit être un objet")
    if (input.schema_version !== WORKSPACE_DIAGNOSTIC_SCHEMA_VERSION) {
      throw new Error(`schema_version doit valoir ${WORKSPACE_DIAGNOSTIC_SCHEMA_VERSION}`)
    }

    const correlations = requiredArray(input.correlations, "correlations")
      .map((item, index) => parseCorrelation(item, `correlations[${index}]`, options))
    const priorities = requiredArray(input.priorities, "priorities")
      .map((item, index) => parsePriority(item, `priorities[${index}]`))
    const watchList = requiredArray(input.watchList, "watchList")
      .map((item, index) => parseWatchItem(item, `watchList[${index}]`))
    const strengths = requiredArray(input.strengths, "strengths")
      .map((item, index) => parseStrength(item, `strengths[${index}]`))

    if (correlations.length > 4) throw new Error("correlations dépasse la limite de 4")
    if (priorities.length > 3) throw new Error("priorities dépasse la limite de 3")
    if (watchList.length > 3) throw new Error("watchList dépasse la limite de 3")
    if (strengths.length > 3) throw new Error("strengths dépasse la limite de 3")

    const correlationIds = new Set(correlations.map((correlation) => correlation.id))
    if (correlationIds.size !== correlations.length) {
      throw new Error("Les identifiants de corrélation doivent être uniques")
    }
    for (const priority of priorities) {
      if (priority.relatedCorrelationIds.some((id) => !correlationIds.has(id))) {
        throw new Error(`La priorité ${priority.rank} référence une corrélation inconnue`)
      }
    }

    return {
      ok: true,
      value: {
        schema_version: WORKSPACE_DIAGNOSTIC_SCHEMA_VERSION,
        generatedAt: requiredString(input.generatedAt, "generatedAt"),
        periodLabel: requiredString(input.periodLabel, "periodLabel"),
        executiveSummary: requiredString(input.executiveSummary, "executiveSummary"),
        correlations,
        priorities,
        watchList,
        strengths,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Diagnostic invalide",
    }
  }
}
