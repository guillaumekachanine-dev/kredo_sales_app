import type {
  CommunicationActivityCategory,
  CommunicationBrief,
  CommunicationLength,
  CommunicationOutput,
  CommunicationOutputKind,
  CommunicationScope,
  MeetingBriefingOutput,
  PitchOutput,
  SpokenPitchOutput,
} from "@/lib/n8n/types"
import { SCENARIO_REGISTRY } from "@/lib/communication/communication-scenario-registry"
import type { Database, Json } from "@/types/database"

export type IntelligenceDocumentType = Database["public"]["Enums"]["intelligence_document_type"]
export type IntelligenceEntityType = Database["public"]["Enums"]["intelligence_entity_type"]

export type DocumentLinkInput = {
  entityType: IntelligenceEntityType
  entityId: string
}

export type ResultPresentationModel = {
  outputKind: CommunicationOutputKind
  activityCategory: CommunicationActivityCategory | null
  scope: CommunicationScope
  scenario: string | null
  length: CommunicationLength
  isCommercial: boolean
  primaryLabel: string
  headingLabel: string
  titlePrefix: string
  lengthLabel: string
  spokenCentralLabel: string
  briefingObjectiveLabel: string
  briefingCrossSellLabel: string
  briefingDataPointsLabel: string
  briefingCloseOptionsLabel: string
}

type PresentationInput = {
  outputKind?: unknown
  activityCategory?: unknown
  scope?: unknown
  scenario?: unknown
  length?: unknown
}

type EntityBuildInput = {
  inputSnapshot: Json | unknown
  companyId?: string | null
  runPrimaryEntityType?: string | null
  runPrimaryEntityId?: string | null
}

const COMMERCIAL_CATEGORIES = new Set<CommunicationActivityCategory>([
  "commerce_prospection",
  "commerce_actif",
])

const RESULT_DOCUMENT_TYPE_BY_RESULT_TYPE: Record<string, IntelligenceDocumentType> = {
  communication: "communication",
  client_summary: "client_summary",
  commercial_pitch: "commercial_pitch",
  pitch: "commercial_pitch",
  pitch_mail: "commercial_pitch",
  prise_de_parole: "prise_de_parole",
  commercial_strategy: "commercial_strategy",
  campaign: "campaign",
  activity_commercial: "activity_commercial",
  activity_recruitment: "activity_recruitment",
  weekly_manager: "weekly_manager",
  workspace_diagnostic: "workspace_diagnostic",
  strategic_watch_analysis: "strategic_watch_analysis",
} satisfies Record<string, IntelligenceDocumentType>

const FALLBACK_TITLE_BY_DOCUMENT_TYPE = {
  communication: "Message IA",
  client_summary: "Synthese client IA",
  commercial_pitch: "Pitch commercial IA",
  prise_de_parole: "Prise de parole IA",
  commercial_strategy: "Strategie commerciale IA",
  campaign: "Campagne IA",
  internal_note: "Note IA",
  activity_commercial: "Rapport d'activite commerciale",
  activity_recruitment: "Rapport d'activite recrutement",
  weekly_manager: "Brief hebdomadaire",
  planning_deadlines: "Planning & echeances",
  financial: "Rapport financier",
  quarterly_review: "Business review trimestrielle",
  staffing_capacity: "Staffing & capacite",
  delivery_profitability: "Delivery & rentabilite",
  account_portfolio: "Revue de portefeuille comptes",
  workspace_diagnostic: "Diagnostic du centre de profit",
  financial_reference: "Reference financiere",
  commercial_quote: "Devis client",
  strategic_watch_analysis: "Analyse stratégique de la veille",
} satisfies Record<IntelligenceDocumentType, string>

const LENGTH_LABELS = {
  ultra_short: "30 s",
  concise: "1 min",
  standard: "2 min",
  detailed: "5 min",
} satisfies Record<CommunicationLength, string>

const BRIEFING_DEPTH_LABELS = {
  ultra_short: "Flash",
  concise: "Synthétique",
  standard: "Standard",
  detailed: "Approfondi",
} satisfies Record<CommunicationLength, string>

const SCENARIO_TITLE_OVERRIDES: Record<string, string> = {
  atypical_candidate_defense: "Défense d’un candidat",
  candidate_to_client_pitch: "Défense d’un candidat",
  retention_conversation_briefing: "Entretien de rétention",
  retention_conversation_talk_track: "Entretien de rétention",
  resource_arbitrage_pitch: "Arbitrage de ressources",
  internal_arbitrage_request: "Arbitrage de ressources",
  mission_follow_up: "Suivi de mission",
  project_status_pitch: "Suivi de mission",
}

const SUPPORTED_ENTITY_TYPES = new Set<IntelligenceEntityType>([
  "company",
  "contact",
  "opportunity",
  "mission",
  "project",
  "collaborator",
  "candidate",
  "sector",
  "calendar_event",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function asOutputKind(value: unknown): CommunicationOutputKind | null {
  return value === "written_message" || value === "spoken_pitch" || value === "structured_briefing"
    ? value
    : null
}

function asLength(value: unknown): CommunicationLength {
  return value === "ultra_short" || value === "concise" || value === "standard" || value === "detailed"
    ? value
    : "standard"
}

function asScope(value: unknown): CommunicationScope | null {
  return value === "account" || value === "collaborator" || value === "internal" ? value : null
}

function asActivityCategory(value: unknown): CommunicationActivityCategory | null {
  if (
    value === "commerce_prospection" ||
    value === "commerce_actif" ||
    value === "delivery" ||
    value === "recrutement" ||
    value === "management_consultants" ||
    value === "internal_staff" ||
    value === "interne_management"
  ) {
    return value
  }
  return null
}

function categoryScope(category: CommunicationActivityCategory | null): CommunicationScope | null {
  switch (category) {
    case "commerce_prospection":
    case "commerce_actif":
    case "delivery":
    case "recrutement":
      return "account"
    case "management_consultants":
      return "collaborator"
    case "internal_staff":
      return "internal"
    case "interne_management":
    case null:
      return null
  }
}

function getBriefRecord(inputSnapshot: unknown): Record<string, unknown> | null {
  return isRecord(inputSnapshot) ? inputSnapshot : null
}

function extractPresentationInput(inputSnapshot: unknown): PresentationInput {
  const brief = getBriefRecord(inputSnapshot)
  const what = isRecord(brief?.what) ? brief.what : null
  return {
    outputKind: what?.outputKind ?? brief?.outputKind,
    activityCategory: what?.activityCategory ?? brief?.activityCategory,
    scope: what?.scope ?? brief?.scope,
    scenario: what?.scenario ?? brief?.scenario,
    length: what?.length ?? brief?.length,
  }
}

function inferOutputKind(input: PresentationInput): CommunicationOutputKind {
  const direct = asOutputKind(input.outputKind)
  if (direct) return direct

  const channel = stringOrNull((input as { channel?: unknown }).channel)
  if (channel === "spoken_pitch_30s") return "spoken_pitch"
  if (channel === "meeting_briefing") return "structured_briefing"
  return "written_message"
}

function getScenarioLabel(scenario: string | null): string | null {
  if (!scenario) return null
  if (SCENARIO_TITLE_OVERRIDES[scenario]) return SCENARIO_TITLE_OVERRIDES[scenario]
  return SCENARIO_REGISTRY.find((item) => item.value === scenario)?.label ?? scenario
}

function addLink(
  links: DocumentLinkInput[],
  seen: Set<string>,
  entityType: string | null | undefined,
  entityId: string | null | undefined
) {
  if (!entityType || !entityId || !SUPPORTED_ENTITY_TYPES.has(entityType as IntelligenceEntityType)) return
  const normalized: DocumentLinkInput = {
    entityType: entityType as IntelligenceEntityType,
    entityId,
  }
  const key = `${normalized.entityType}:${normalized.entityId}`
  if (seen.has(key)) return
  seen.add(key)
  links.push(normalized)
}

export function mapResultTypeToDocumentType(resultType: string): IntelligenceDocumentType | null {
  return RESULT_DOCUMENT_TYPE_BY_RESULT_TYPE[resultType] ?? null
}

export function isEligibleDocumentResultType(resultType: string): boolean {
  return mapResultTypeToDocumentType(resultType) !== null
}

export function buildResultPresentationModel(input: PresentationInput): ResultPresentationModel {
  const outputKind = inferOutputKind(input)
  const activityCategory = asActivityCategory(input.activityCategory)
  const scope = asScope(input.scope) ?? categoryScope(activityCategory) ?? "account"
  const length = asLength(input.length)
  const isCommercial = activityCategory ? COMMERCIAL_CATEGORIES.has(activityCategory) : scope === "account"
  const scenario = stringOrNull(input.scenario)
  const lengthLabel = outputKind === "structured_briefing" ? BRIEFING_DEPTH_LABELS[length] : LENGTH_LABELS[length]

  const titlePrefix =
    outputKind === "written_message"
      ? "Message"
      : outputKind === "spoken_pitch"
        ? isCommercial
          ? "Pitch oral"
          : "Prise de parole"
        : "Briefing"

  const headingLabel =
    outputKind === "written_message"
      ? "Message généré"
      : `${titlePrefix} · ${lengthLabel}`

  const briefingObjectiveLabel =
    scope === "collaborator"
      ? "Objectif de l’entretien"
      : scope === "internal"
        ? "Objectif de l’échange"
        : "Objectif du rendez-vous"

  return {
    outputKind,
    activityCategory,
    scope,
    scenario,
    length,
    isCommercial,
    primaryLabel: titlePrefix,
    headingLabel,
    titlePrefix,
    lengthLabel,
    spokenCentralLabel: isCommercial ? "Lien avec l’offre" : "Message à faire passer",
    briefingObjectiveLabel,
    briefingCrossSellLabel: isCommercial ? "Cross-sell possible" : "Pistes à explorer",
    briefingDataPointsLabel: isCommercial ? "Chiffres à citer" : "Faits à mobiliser",
    briefingCloseOptionsLabel: isCommercial ? "Sorties possibles du RDV" : "Issues et prochaines étapes",
  }
}

export function buildResultPresentationFromBrief(brief: CommunicationBrief): ResultPresentationModel {
  return buildResultPresentationModel({
    outputKind: brief.what.outputKind,
    activityCategory: brief.what.activityCategory,
    scope: brief.what.scope,
    scenario: brief.what.scenario,
    length: brief.what.length,
  })
}

export function buildResultPresentationFromSnapshot(inputSnapshot: unknown): ResultPresentationModel {
  return buildResultPresentationModel(extractPresentationInput(inputSnapshot))
}

export function buildDocumentScopeJson(inputSnapshot: Json | unknown): Json | null {
  const brief = getBriefRecord(inputSnapshot)
  if (!brief) return null
  const what = isRecord(brief.what) ? brief.what : null

  if (!what && isRecord(brief.scope)) {
    return brief.scope as Json
  }

  const who = isRecord(brief.who) ? brief.who : null
  const recipient = isRecord(who?.recipient) ? who.recipient : null
  const context = isRecord(brief.context) ? brief.context : null
  const model = buildResultPresentationFromSnapshot(inputSnapshot)

  return {
    scope: model.scope,
    outputKind: model.outputKind,
    activityCategory: model.activityCategory,
    scenario: model.scenario,
    recipientType: stringOrNull(recipient?.type),
    internalRole: stringOrNull(recipient?.internalRole),
    internalRelationship: stringOrNull(recipient?.internalRelationship),
    internalDomain: stringOrNull(recipient?.internalDomain),
    references: {
      companyRef: stringOrNull(context?.companyRef),
      contactId: stringOrNull(recipient?.contactId),
      opportunityRef: stringOrNull(context?.opportunityRef),
      missionRef: stringOrNull(context?.missionRef),
      profileRef: stringOrNull(context?.profileRef),
      collaboratorRef: stringOrNull(context?.collaboratorRef) ?? stringOrNull(recipient?.collaboratorId),
      offerRef: stringOrNull(context?.offerRef),
    },
  } as Json
}

export function buildDocumentEntities(input: EntityBuildInput): {
  links: DocumentLinkInput[]
  primaryEntity: DocumentLinkInput | null
} {
  const links: DocumentLinkInput[] = []
  const seen = new Set<string>()
  const brief = getBriefRecord(input.inputSnapshot)
  const who = isRecord(brief?.who) ? brief.who : null
  const recipient = isRecord(who?.recipient) ? who.recipient : null
  const context = isRecord(brief?.context) ? brief.context : null

  let primaryEntity: DocumentLinkInput | null = null
  if (
    input.runPrimaryEntityType &&
    input.runPrimaryEntityId &&
    SUPPORTED_ENTITY_TYPES.has(input.runPrimaryEntityType as IntelligenceEntityType)
  ) {
    primaryEntity = {
      entityType: input.runPrimaryEntityType as IntelligenceEntityType,
      entityId: input.runPrimaryEntityId,
    }
  } else if (input.companyId) {
    primaryEntity = { entityType: "company", entityId: input.companyId }
  }

  addLink(links, seen, primaryEntity?.entityType, primaryEntity?.entityId)
  addLink(links, seen, "company", input.companyId ?? null)
  addLink(links, seen, "company", stringOrNull(context?.companyRef))
  addLink(links, seen, "contact", stringOrNull(recipient?.contactId))
  addLink(links, seen, "opportunity", stringOrNull(context?.opportunityRef))
  addLink(links, seen, "mission", stringOrNull(context?.missionRef))
  addLink(links, seen, "candidate", stringOrNull(context?.profileRef))
  addLink(links, seen, "collaborator", stringOrNull(context?.collaboratorRef) ?? stringOrNull(recipient?.collaboratorId))

  return { links, primaryEntity }
}

export function buildFallbackDocumentTitle(documentType: IntelligenceDocumentType) {
  return FALLBACK_TITLE_BY_DOCUMENT_TYPE[documentType]
}

export function buildCommunicationDocumentTitle(input: {
  documentType: IntelligenceDocumentType
  resultTitle?: string | null
  contentJson?: unknown
  inputSnapshot?: unknown
}) {
  const presentation = buildResultPresentationFromSnapshot(input.inputSnapshot)
  const scenarioLabel = getScenarioLabel(presentation.scenario)

  if (
    input.documentType === "communication" ||
    input.documentType === "commercial_pitch" ||
    input.documentType === "prise_de_parole"
  ) {
    if (scenarioLabel) return `${presentation.titlePrefix} — ${scenarioLabel}`
    const generatedTitle = normalizeText(input.resultTitle)
    if (generatedTitle) return `${presentation.titlePrefix} — ${generatedTitle}`
  }

  return normalizeText(input.resultTitle) ?? buildFallbackDocumentTitle(input.documentType)
}

export function isCommunicationOutput(value: unknown): value is CommunicationOutput {
  return isRecord(value) && typeof value.body === "string"
}

export function isSpokenPitchOutput(value: unknown): value is SpokenPitchOutput {
  return isRecord(value) && value.kind === "spoken_pitch" && typeof value.hook === "string"
}

export function isMeetingBriefingOutput(value: unknown): value is MeetingBriefingOutput {
  return isRecord(value) && value.kind === "meeting_briefing" && typeof value.objective === "string"
}

export function isPitchOutput(value: unknown): value is PitchOutput {
  return isSpokenPitchOutput(value) || isMeetingBriefingOutput(value)
}

export function buildResultContentText(
  contentJson: unknown,
  fallbackText: string | null | undefined,
  presentation: ResultPresentationModel
): string | null {
  if (isCommunicationOutput(contentJson)) {
    const parts = [
      contentJson.subjects?.[0] ? `Objet : ${contentJson.subjects[0]}` : null,
      contentJson.body,
      contentJson.key_points?.length ? ["Points clés :", ...contentJson.key_points.map((point) => `- ${point}`)].join("\n") : null,
    ]
    return normalizeText(parts.filter(Boolean).join("\n\n"))
  }

  if (isSpokenPitchOutput(contentJson)) {
    const blocks = [
      ["Accroche", contentJson.hook],
      ["Diagnostic", contentJson.problem_recognition],
      [presentation.spokenCentralLabel, contentJson.offer_link],
      ["Demande", contentJson.ask],
      ["Repli", contentJson.alt_close],
    ]
    return normalizeText(blocks.map(([label, text]) => `${label} : ${text}`).join("\n\n"))
  }

  if (isMeetingBriefingOutput(contentJson)) {
    const lines = [
      `${presentation.briefingObjectiveLabel} : ${contentJson.objective}`,
      `Message clé : ${contentJson.key_message}`,
      "",
      "Arguments :",
      ...contentJson.arguments.map((argument) => `- ${argument.title} - ${argument.evidence}`),
      "",
      "Objections attendues :",
      ...contentJson.expected_objections.map((objection) => `- "${objection.objection}" → ${objection.response}`),
    ]
    if (contentJson.postures?.length) {
      lines.push("", "Postures à adopter :", ...contentJson.postures.map((posture) => `- ${posture.situation} — ${posture.posture}`))
    }
    if (contentJson.cross_sell_hypotheses.length) {
      lines.push("", `${presentation.briefingCrossSellLabel} :`, ...contentJson.cross_sell_hypotheses.map((item) => `- ${item}`))
    }
    if (contentJson.data_points_to_mention.length) {
      lines.push("", `${presentation.briefingDataPointsLabel} :`, ...contentJson.data_points_to_mention.map((item) => `- ${item}`))
    }
    if (contentJson.close_options.length) {
      lines.push("", `${presentation.briefingCloseOptionsLabel} :`, ...contentJson.close_options.map((item) => `- ${item}`))
    }
    if (contentJson.do_not_say.length) {
      lines.push("", "À éviter :", ...contentJson.do_not_say.map((item) => `- ${item}`))
    }
    return normalizeText(lines.join("\n"))
  }

  return normalizeText(fallbackText)
}
