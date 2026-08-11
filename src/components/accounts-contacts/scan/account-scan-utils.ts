// Scan rapide compte (Lot 2) — fonctions pures : libellés métier, construction du
// payload de déclenchement, éligibilité à l'auto-application. Aucune logique
// serveur/RPC ici (cf. account-scan-actions.ts) — testable sans mock Supabase.

import type {
  AccountScanCompanyField,
  AccountScanContactCandidate,
  AccountScanContactMode,
  AccountScanFactAttribute,
  AccountScanInformationMode,
  AccountScanOutput,
  AccountScanSource,
  AccountScanTriggerInput,
} from "@/lib/n8n/types"

// ─── Libellés métier français ────────────────────────────────────────────────

export const COMPANY_FIELD_LABELS: Record<AccountScanCompanyField, string> = {
  legal_name: "Raison sociale",
  siren: "SIREN",
  naf_code: "Code NAF",
  description: "Description",
  website: "Site web",
  hq_location: "Siège social",
  sector: "Secteur",
  employee_count: "Effectif",
  revenue: "Chiffre d'affaires",
}

export const FACT_ATTRIBUTE_LABELS: Record<AccountScanFactAttribute, string> = {
  business_model: "Modèle économique",
  primary_activity: "Activité principale",
  technology: "Technologie",
  competitor: "Concurrent",
  partner: "Partenaire",
  market: "Marché",
  strategic_priority: "Priorité stratégique",
  transformation_program: "Programme de transformation",
  establishment_count: "Nombre d'établissements",
  growth_trend: "Tendance de croissance",
  geographic_reach: "Rayonnement géographique",
  value_proposition: "Proposition de valeur",
  differentiators: "Différenciation",
  market_position: "Position marché",
  marketing_position: "Positionnement marketing",
  target_customers: "Clientèle cible",
}

export function getAttributeLabel(attributeName: string): string {
  return (
    COMPANY_FIELD_LABELS[attributeName as AccountScanCompanyField] ??
    FACT_ATTRIBUTE_LABELS[attributeName as AccountScanFactAttribute] ??
    attributeName
  )
}

export const SOURCE_TYPE_LABELS: Record<AccountScanSource["sourceType"], string> = {
  official_site: "Site officiel",
  press_release: "Communiqué de presse",
  job_board: "Offre d'emploi",
  professional_profile: "Profil professionnel",
  regulatory_filing: "Registre officiel",
  news_media: "Presse",
  public_tender: "Marché public",
  internal_crm: "CRM interne",
  human_note: "Note manuelle",
  other: "Autre",
}

// ─── Construction du payload de déclenchement (POST /api/n8n/trigger) ──────

export type AccountScanKnownCompany = AccountScanTriggerInput["knownCompany"]

export type AccountScanSetupValues = {
  informationMode: AccountScanInformationMode
  requestedFields: AccountScanCompanyField[]
  requestedFacts: AccountScanFactAttribute[]
  requestClassification: boolean
  websiteHint: string | null
  locationHint: string | null
  selectedSiren?: string | null
  customSources: { url: string; label: string }[]
}

export type AccountScanContactsSetupValues = {
  contactMode: Exclude<AccountScanContactMode, "none">
  requestedRoles: string[]
  maxContacts: number
  recentHireOnly: boolean
  searchVectors: string[]
}

export function buildAccountScanInput(
  setup: AccountScanSetupValues,
  knownCompany: AccountScanKnownCompany,
  classificationReferential?: AccountScanTriggerInput["classificationReferential"],
): AccountScanTriggerInput {
  return {
    schemaVersion: 1,
    operation: "account_scan",
    companyId: "", // renseigné par l'appelant via entityId du payload /api/n8n/trigger, pas ici
    informationMode: setup.informationMode,
    contactMode: "none",
    requestedFields: setup.requestedFields,
    requestedFacts: setup.requestedFacts,
    knownCompany,
    selectedSiren: setup.selectedSiren ?? null,
    websiteHint: setup.websiteHint?.trim() || null,
    locationHint: setup.locationHint?.trim() || null,
    autoApplyOfficialMissing: false, // Forcé à false (retiré de l'UI)
    // ADR-0019 Lot 4 — la classification n'est demandée que si le référentiel a
    // pu être chargé et si l'utilisateur l'a cochée.
    requestClassification: setup.requestClassification && Boolean(classificationReferential?.segments.length),
    classificationReferential,
    // Add custom sources if n8n supports it, though for now we pass it just in case
    // (We could pass it in input but let's stick to the interface)
  }
}

export function clampMaxContacts(value: number): number {
  if (!Number.isFinite(value)) return 5
  return Math.max(1, Math.min(10, Math.trunc(value)))
}

export function buildAccountScanContactsInput(
  setup: AccountScanContactsSetupValues,
  knownCompany: AccountScanKnownCompany,
  context: {
    selectedSiren?: string | null
    websiteHint?: string | null
    locationHint?: string | null
  } = {},
): AccountScanTriggerInput {
  return {
    schemaVersion: 1,
    operation: "account_scan",
    companyId: "",
    informationMode: "verify",
    contactMode: setup.contactMode,
    requestedFields: [],
    requestedFacts: [],
    requestedRoles: setup.requestedRoles.map((role) => role.trim()).filter(Boolean),
    maxContacts: clampMaxContacts(setup.maxContacts),
    recentHireOnly: setup.recentHireOnly,
    searchVectors: setup.searchVectors,
    knownCompany,
    selectedSiren: context.selectedSiren ?? knownCompany.siren ?? null,
    websiteHint: context.websiteHint?.trim() || knownCompany.website || null,
    locationHint: context.locationHint?.trim() || null,
    autoApplyOfficialMissing: false,
  }
}

// ─── Sélection des candidats contacts (§11) ─────────────────────────────────
// Deux règles distinctes, volontairement séparées :
//  - candidateCanBeSelected : gouverne la case à cocher (peut-on sélectionner
//    manuellement ce candidat ?). Large — exclut seulement "ignore" (le RPC le
//    traiterait comme no-op de toute façon) et l'email inféré comme email
//    n'est jamais importé par le RPC quel que soit ce champ, mais le contact
//    lui-même peut toujours être créé sans email par une action explicite.
//  - candidateShouldBeDefaultSelected : gouverne la présélection AUTOMATIQUE
//    à l'ouverture des résultats. Stricte (§11 : confiance >= 0.70, email non
//    inféré, action create/link uniquement — jamais update/ignore, au moins
//    une source) — un candidat "update" implique une correction d'une valeur
//    CRM existante, jamais pré-cochée sans lecture humaine du delta.
// Avant ce correctif, une seule fonction faible gouvernait les deux usages :
// la présélection par défaut cochait aussi des candidats "update" ou à faible
// confiance, ce que §11 interdit explicitement.

export function candidateCanBeSelected(candidate: AccountScanContactCandidate): boolean {
  return candidate.suggestedAction !== "ignore"
}

export const AUTO_SELECT_CONFIDENCE_THRESHOLD = 0.7

export function candidateShouldBeDefaultSelected(candidate: AccountScanContactCandidate): boolean {
  return (
    (candidate.suggestedAction === "create" || candidate.suggestedAction === "link") &&
    candidate.emailStatus !== "inferred" &&
    candidate.confidenceScore >= AUTO_SELECT_CONFIDENCE_THRESHOLD &&
    candidate.sourceKeys.length > 0
  )
}

export type AccountScanRunPhase = "information" | "contacts"

export function phaseFromContactMode(contactMode: unknown): AccountScanRunPhase {
  return contactMode === "identify" || contactMode === "confirm" ? "contacts" : "information"
}

// ─── Éligibilité à l'auto-application (§11) ─────────────────────────────────
// Allowlist V1 stricte — jamais les faits interprétatifs, jamais une correction
// d'une valeur déjà renseignée, jamais en cas d'ambiguïté juridique ou de source
// non officielle. Une source "officielle" ici = le registre public
// (regulatory_filing) — un simple websiteHint fourni par l'utilisateur n'a pas
// de source associée et ne peut donc jamais s'auto-appliquer (comportement
// volontairement conservateur, cf. SETUP.md Lot 1 §5).

export const AUTO_APPLY_ALLOWLIST: readonly AccountScanCompanyField[] = [
  "legal_name",
  "siren",
  "naf_code",
  "hq_location",
  "employee_count",
  "website",
]

const OFFICIAL_SOURCE_TYPES: ReadonlySet<AccountScanSource["sourceType"]> = new Set([
  "regulatory_filing",
])

export const AUTO_APPLY_CONFIDENCE_THRESHOLD = 0.9

export type ProposalForEligibility = {
  attributeName: string
  oldValue: unknown
  confidenceScore: number
  sourceKeys: string[]
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === ""
}

export function isAutoApplyEligible(
  proposal: ProposalForEligibility,
  sources: AccountScanSource[],
  resolutionStatus: AccountScanOutput["resolution"]["status"],
): boolean {
  if (resolutionStatus !== "resolved") return false
  if (!AUTO_APPLY_ALLOWLIST.includes(proposal.attributeName as AccountScanCompanyField)) return false
  if (!isEmptyValue(proposal.oldValue)) return false
  if (proposal.confidenceScore < AUTO_APPLY_CONFIDENCE_THRESHOLD) return false

  const sourceByKey = new Map(sources.map((s) => [s.sourceKey, s]))
  const hasOfficialSource = proposal.sourceKeys.some((key) => {
    const source = sourceByKey.get(key)
    return source ? OFFICIAL_SOURCE_TYPES.has(source.sourceType) : false
  })
  if (!hasOfficialSource) return false

  return true
}

// ─── Affichage confiance ─────────────────────────────────────────────────────

export function formatConfidencePercent(score: number): string {
  return `${Math.round(score * 100)}%`
}

export type ConfidenceTone = "high" | "medium" | "low"

export function getConfidenceTone(score: number): ConfidenceTone {
  if (score >= 0.75) return "high"
  if (score >= 0.45) return "medium"
  return "low"
}

// ─── Ligne de proposition affichée en revue ─────────────────────────────────
// Fusion de la ligne réelle enrichment_proposals (id, statut — nécessaires pour
// l'application, cf. account-scan-actions.ts) et du contenu descriptif du
// content_json (valeurs, justification, sources) — content_json ne porte pas
// l'id réel de la ligne DB, indispensable pour proposalIds.

export type AccountScanProposalRow = {
  id: string
  attributeName: string
  status: string
  confidenceScore: number
  oldValue: unknown
  proposedValue: unknown
  normalizedValue: unknown
  justification: string | null
  sourceKeys: string[]
  isFact: boolean
}

export type EnrichmentProposalDbRow = {
  id: string
  attribute_name: string
  status: string
  confidence_score: number
  old_value: unknown
  proposed_value: unknown
  normalized_value: unknown
  justification: string | null
}

export function mergeProposalRows(
  dbRows: EnrichmentProposalDbRow[],
  output: AccountScanOutput,
): AccountScanProposalRow[] {
  const contentByAttribute = new Map<string, { sourceKeys: string[] }>()
  for (const fp of output.fieldProposals) {
    contentByAttribute.set(fp.attributeName, { sourceKeys: fp.sourceKeys })
  }
  for (const factP of output.factProposals) {
    // Plusieurs faits multi-valeurs peuvent partager le même attributeName — on
    // ne perd rien puisqu'on ne s'en sert que pour retrouver les sourceKeys,
    // et chaque ligne DB est de toute façon traitée indépendamment ci-dessous.
    contentByAttribute.set(factP.attributeName, { sourceKeys: factP.sourceKeys })
  }

  const factAttributeSet = new Set<string>(Object.keys(FACT_ATTRIBUTE_LABELS))

  return dbRows.map((row) => ({
    id: row.id,
    attributeName: row.attribute_name,
    status: row.status,
    confidenceScore: row.confidence_score,
    oldValue: row.old_value,
    proposedValue: row.proposed_value,
    normalizedValue: row.normalized_value,
    justification: row.justification,
    sourceKeys: contentByAttribute.get(row.attribute_name)?.sourceKeys ?? [],
    isFact: factAttributeSet.has(row.attribute_name),
  }))
}

export function formatProposalValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "object") {
    const sectorValue = value as { name?: string }
    if (typeof sectorValue.name === "string") return sectorValue.name
    return JSON.stringify(value)
  }
  return String(value)
}

// ─── Bilan d'application (§12) ────────────────────────────────────────────────
// operation vient tel quel de public.proposal_operation_result (RPC Lot 0) —
// "ignoré" n'existe pas côté RPC (une proposition non sélectionnée n'est jamais
// envoyée) : c'est une catégorie calculée côté client (cf. AccountScanDialog).

export type AccountScanBilanCategory = "applied" | "already_applied" | "conflicting" | "ignored" | "error"

export const BILAN_LABELS: Record<AccountScanBilanCategory, string> = {
  applied: "Appliqué",
  already_applied: "Déjà appliqué",
  conflicting: "Conflit",
  ignored: "Ignoré",
  error: "Erreur",
}

export function bilanCategoryFromOperation(operation: string): AccountScanBilanCategory {
  if (operation === "applied") return "applied"
  if (operation === "already_applied") return "already_applied"
  if (operation === "conflicting") return "conflicting"
  return "error"
}
