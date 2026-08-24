import type { AccountKnowledgeFact } from "@/lib/intelligence/account-intelligence-contracts"

type JsonRecord = Record<string, unknown>

const EMPTY_VALUE_PATTERN = /^(?:non\s+(?:trouv[ée]e?|renseign[ée]e?|disponible)|n\/?a|—)$/i

export type CompanyIdentityProfile = {
  name: string
  legalName: string
  hqLocation: string
  sector: string
  segment: string
  revenue: string
  employeeCount: string
  geographicReach: string
  companyMomentum: string
}

export type CompanyCustomerSegment = {
  name: string
  description: string | null
  estimatedWeight: string | null
}

export type CompanyMarketPositioning = {
  valueProposition: string
  customer: {
    typicalProfile: string
    segments: CompanyCustomerSegment[]
    unmetNeeds: string[]
    behavioralTrends: string[]
  }
  valueChain: {
    description: string
    keyLinks: string[]
    criticalDependencies: string[]
    vulnerabilities: string[]
  }
}

export type OperationalActivity = {
  code: string | null
  label: string
  description: string | null
  workloadLabel: string | null
}

export type OperationalDepartment = {
  id: string
  label: string
  description: string | null
  activities: OperationalActivity[]
}

export type OperationalStakeholder = {
  department: string
  stakeholder: string
  interactionNature: string | null
  frequency: string | null
  friction: string | null
}

export type OperationalWorkloadSegment = {
  category: string
  categoryLabel: string
  label: string
  percentageLabel: string | null
  percentageValue: number | null
}

export type OperationalWorkloadFunction = {
  functionLabel: string
  segments: OperationalWorkloadSegment[]
}

export type OperationalWorkload = {
  functions: OperationalWorkloadFunction[]
  primaryFinding: string | null
}

export type CompanyOperationalSnapshot = {
  departments: OperationalDepartment[]
  stakeholders: OperationalStakeholder[]
  workload: OperationalWorkload
}

export type ContactOfferCandidate = {
  id: string
  name: string
  practiceName: string
  keywords: string[]
  typicalProfiles: string[]
  shortDescription: string | null
}

export type ContactOfferSuggestion = {
  offerId: string
  offerName: string
}

export type SortableCompanyContact = {
  fullName: string
  relationshipRole: string | null
  isPriority?: boolean
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as JsonRecord
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  return text && !EMPTY_VALUE_PATTERN.test(text) ? text : null
}

function cleanTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const text = cleanText(item)
    return text ? [text] : []
  })
}

function displayValue(value: string | null): string {
  return value ?? "Non renseigné"
}

function humanizeKey(value: string): string {
  const text = value.replace(/[_-]+/g, " ").trim()
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "Non renseigné"
}

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#/.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function slugify(value: string): string {
  return normalizeForMatch(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "department"
}

export function normalizeCompanyIdentity(
  company: {
    name: string
    legalName: string | null
    hqLocation: string | null
    sector: string | null
    segment: string | null
    revenue: string | null
    employeeCount: number | null
    sizeBand: string | null
  },
  metadata: unknown,
): CompanyIdentityProfile {
  const root = asRecord(metadata)
  const analysis = asRecord(root.analysis_data)
  const identity = asRecord(analysis.identite)
  const positioning = asRecord(analysis.positionnement)

  const employeeCount = company.employeeCount !== null
    ? new Intl.NumberFormat("fr-FR").format(company.employeeCount)
    : cleanText(company.sizeBand) ?? cleanText(identity.effectif_estime)

  return {
    name: displayValue(cleanText(company.name)),
    legalName: displayValue(cleanText(company.legalName) ?? cleanText(identity.nom_complet)),
    hqLocation: displayValue(cleanText(company.hqLocation) ?? cleanText(identity.siege_social)),
    sector: displayValue(cleanText(company.sector)),
    segment: displayValue(cleanText(company.segment)),
    revenue: displayValue(cleanText(company.revenue) ?? cleanText(identity.ca_estime)),
    employeeCount: displayValue(employeeCount),
    geographicReach: displayValue(cleanText(positioning.zone_geographique)),
    companyMomentum: displayValue(null),
  }
}

export function normalizeCompanyMarketPositioning(metadata: unknown): CompanyMarketPositioning {
  const root = asRecord(metadata)
  const analysis = asRecord(root.analysis_data)
  const positioning = asRecord(analysis.positionnement)
  const sectorAnalysis = asRecord(root.sector_analysis)
  const customer = asRecord(sectorAnalysis.segment_clientele)
  const chain = asRecord(sectorAnalysis.chaine_valeur)

  const segments = Array.isArray(customer.segmentation)
    ? customer.segmentation.flatMap((entry): CompanyCustomerSegment[] => {
        const row = asRecord(entry)
        const name = cleanText(row.segment)
        if (!name) return []
        return [{
          name,
          description: cleanText(row.description),
          estimatedWeight: cleanText(row.poids_estime),
        }]
      })
    : []

  return {
    valueProposition: displayValue(cleanText(positioning.proposition_valeur)),
    customer: {
      typicalProfile: displayValue(cleanText(customer.profil_client_type)),
      segments,
      unmetNeeds: cleanTextList(customer.besoins_non_couverts),
      behavioralTrends: cleanTextList(customer.tendances_comportementales),
    },
    valueChain: {
      description: displayValue(cleanText(chain.description_chaine)),
      keyLinks: cleanTextList(chain.maillons_cles),
      criticalDependencies: cleanTextList(chain.dependances_critiques),
      vulnerabilities: cleanTextList(chain.points_vulnerabilite),
    },
  }
}

function normalizeActivity(value: unknown): OperationalActivity | null {
  const row = asRecord(value)
  const label = cleanText(row.activite) ?? cleanText(row.label)
  if (!label) return null
  return {
    code: cleanText(row.ref) ?? cleanText(row.code),
    label,
    description: cleanText(row.description),
    workloadLabel: cleanText(row.pct_temps) ?? cleanText(row.part_temps),
  }
}

export function normalizeOperationalDepartments(raw: unknown): OperationalDepartment[] {
  const root = asRecord(raw)
  return Object.entries(root).flatMap(([departmentKey, departmentValue]) => {
    const departmentRecord = asRecord(departmentValue)
    const activityValues = Array.isArray(departmentValue)
      ? departmentValue
      : Array.isArray(departmentRecord.activites)
        ? departmentRecord.activites
        : []
    const activities = activityValues.flatMap((activity) => {
      const normalized = normalizeActivity(activity)
      return normalized ? [normalized] : []
    })
    if (activities.length === 0) return []
    return [{
      id: slugify(departmentKey),
      label: humanizeKey(departmentKey),
      description: cleanText(departmentRecord.description),
      activities,
    }]
  })
}

function normalizeStakeholderEntry(value: unknown, department: string): OperationalStakeholder | null {
  const row = asRecord(value)
  const stakeholder = cleanText(row.interlocuteur) ?? cleanText(row.stakeholder)
  if (!stakeholder) return null
  return {
    department,
    stakeholder,
    interactionNature: cleanText(row.nature) ?? cleanText(row.interaction_nature),
    frequency: cleanText(row.frequence) ?? cleanText(row.frequency),
    friction: cleanText(row.friction),
  }
}

export function normalizeOperationalStakeholders(raw: unknown): OperationalStakeholder[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => {
      const row = asRecord(entry)
      const department = cleanText(row.department) ?? "Département non renseigné"
      const normalized = normalizeStakeholderEntry(entry, department)
      return normalized ? [normalized] : []
    })
  }

  return Object.entries(asRecord(raw)).flatMap(([departmentKey, entries]) => {
    if (!Array.isArray(entries)) return []
    const department = humanizeKey(departmentKey)
    return entries.flatMap((entry) => {
      const normalized = normalizeStakeholderEntry(entry, department)
      return normalized ? [normalized] : []
    })
  })
}

const WORKLOAD_CATEGORY_LABELS: Record<string, string> = {
  coeur_metier: "Cœur de métier",
  administratif: "Administratif",
  relationnel: "Relationnel",
  pilotage: "Pilotage",
  coordination: "Coordination",
  qualite_conformite: "Qualité & conformité",
}

function parseWorkloadSegment(category: string, value: unknown): OperationalWorkloadSegment | null {
  const source = cleanText(value)
  if (!source) return null
  const percentageMatch = source.match(/(\d+(?:[.,]\d+)?(?:\s*[-–à]\s*\d+(?:[.,]\d+)?)?\s*%)/i)
  const percentageLabel = percentageMatch?.[1]?.replace(/\s+/g, " ") ?? null
  const exactMatch = percentageLabel?.match(/^(\d+(?:[.,]\d+)?)\s*%$/)
  const percentageValue = exactMatch ? Number(exactMatch[1].replace(",", ".")) : null
  const label = source.replace(/\s*\([^)]*%[^)]*\)\s*$/, "").trim() || humanizeKey(category)
  return {
    category,
    categoryLabel: WORKLOAD_CATEGORY_LABELS[category] ?? humanizeKey(category),
    label,
    percentageLabel,
    percentageValue: percentageValue !== null && Number.isFinite(percentageValue) ? percentageValue : null,
  }
}

export function normalizeOperationalWorkload(raw: unknown): OperationalWorkload {
  const root = asRecord(raw)
  const rows = Array.isArray(root.par_fonction) ? root.par_fonction : []
  const functions = rows.flatMap((entry): OperationalWorkloadFunction[] => {
    const row = asRecord(entry)
    const functionLabel = cleanText(row.fonction)
    if (!functionLabel) return []
    const segments = Object.entries(row).flatMap(([category, value]) => {
      if (category === "fonction") return []
      const normalized = parseWorkloadSegment(category, value)
      return normalized ? [normalized] : []
    })
    return segments.length > 0 ? [{ functionLabel, segments }] : []
  })

  return {
    functions,
    primaryFinding:
      cleanText(root.constat_critique)
      ?? cleanText(root.constat_cle)
      ?? cleanText(root.constat_principal)
      ?? cleanText(root.analyse),
  }
}

export function normalizeCompanyOperationalSnapshot(content: unknown): CompanyOperationalSnapshot {
  const root = asRecord(content)
  return {
    departments: normalizeOperationalDepartments(root.cartographie_activites),
    stakeholders: normalizeOperationalStakeholders(root.cartographie_interlocuteurs),
    workload: normalizeOperationalWorkload(root.repartition_charge),
  }
}

const CONTACT_ROLE_RANK: Record<string, number> = {
  decideur: 0,
  prescripteur: 1,
  acheteur: 2,
}

export function sortCompanyContacts<T extends SortableCompanyContact>(contacts: readonly T[]): T[] {
  return [...contacts].sort((a, b) => {
    const priorityDelta = Number(Boolean(b.isPriority)) - Number(Boolean(a.isPriority))
    if (priorityDelta !== 0) return priorityDelta
    const roleDelta = (CONTACT_ROLE_RANK[a.relationshipRole ?? ""] ?? 3) - (CONTACT_ROLE_RANK[b.relationshipRole ?? ""] ?? 3)
    if (roleDelta !== 0) return roleDelta
    return a.fullName.localeCompare(b.fullName, "fr", { sensitivity: "base" })
  })
}

type OfferDomainRule = {
  priority: number
  contactTerms: string[]
  offerTerms: string[]
  preferredOfferTerms: string[]
}

const OFFER_DOMAIN_RULES: OfferDomainRule[] = [
  {
    priority: 10,
    contactTerms: ["digital", "numerique", "applicatif", "application", "portail", "logiciel", "software"],
    offerTerms: ["digital business solutions", "business application", "b2b portal", "custom software"],
    preferredOfferTerms: ["custom business applications", "b2b portals"],
  },
  {
    priority: 20,
    contactTerms: ["data", "donnee", "donnees", "ia", "intelligence artificielle", "analytics", "bi"],
    offerTerms: ["data & ai", "data strategy", "ai strategy", "analytics", "machine learning", "generative ai"],
    preferredOfferTerms: ["data & ai strategy", "governance", "responsible ai"],
  },
  {
    priority: 10,
    contactTerms: [
      "cloud",
      "infrastructure",
      "devops",
      "plateforme",
      "operations",
      "sre",
      "systeme",
      "systemes",
      "system",
      "systems",
      "reseau",
      "reseaux",
      "cto",
      "informatique",
    ],
    offerTerms: ["cloud engineering", "cloud strategy", "platform engineering", "cloud operations"],
    preferredOfferTerms: ["cloud strategy", "assessment", "landing zones"],
  },
  {
    priority: 30,
    contactTerms: ["cyber", "cybersecurity", "securite", "security", "cto & security", "grc", "risque", "rssi", "ciso"],
    offerTerms: ["cybersecurity", "cyber strategy", "security architecture", "iam", "soc"],
    preferredOfferTerms: ["cyber strategy", "grc", "compliance"],
  },
  {
    priority: 30,
    contactTerms: ["qualite", "quality", "test", "testing", "qa", "recette"],
    offerTerms: ["quality engineering", "quality strategy", "testing", "test automation"],
    preferredOfferTerms: ["quality strategy", "test governance"],
  },
  {
    priority: 20,
    contactTerms: ["projet", "project", "programme", "pmo", "agile", "scrum", "delivery"],
    offerTerms: ["project & agile delivery", "project management", "program management", "agile delivery", "pmo"],
    preferredOfferTerms: ["project & program management"],
  },
  {
    priority: 30,
    contactTerms: ["legacy", "mainframe", "cobol", "zos", "z/os"],
    offerTerms: ["legacy systems", "mainframe", "legacy estate", "legacy modernization"],
    preferredOfferTerms: ["legacy estate assessment", "risk reduction"],
  },
  {
    priority: 30,
    contactTerms: [
      "experience digitale",
      "experience numerique",
      "ux",
      "ui",
      "service design",
      "product design",
      "design system",
      "design systems",
      "produit digital",
    ],
    offerTerms: ["digital experience", "ux research", "service design", "product design", "design systems"],
    preferredOfferTerms: ["ux research", "service design"],
  },
]

function containsTerm(text: string, term: string): boolean {
  const normalizedTerm = normalizeForMatch(term)
  return normalizedTerm.length > 0 && ` ${text} `.includes(` ${normalizedTerm} `)
}

export function resolveContactOfferSuggestion(
  contact: { jobTitle: string | null; department: string | null },
  offers: readonly ContactOfferCandidate[],
): ContactOfferSuggestion | null {
  const contactText = normalizeForMatch(`${contact.jobTitle ?? ""} ${contact.department ?? ""}`)
  if (!contactText) return null

  const matchedRule = OFFER_DOMAIN_RULES
    .map((rule) => ({ rule, matches: rule.contactTerms.filter((term) => containsTerm(contactText, term)).length }))
    .filter(({ matches }) => matches > 0)
    .sort((a, b) => b.matches - a.matches || b.rule.priority - a.rule.priority)[0]?.rule
  if (!matchedRule) return null

  const contactTokens = contactText.split(" ").filter((token) => token.length >= 3)
  const ranked = offers.flatMap((offer) => {
    const corpus = normalizeForMatch([
      offer.name,
      offer.practiceName,
      offer.shortDescription ?? "",
      ...offer.keywords,
      ...offer.typicalProfiles,
    ].join(" "))
    const domainMatches = matchedRule.offerTerms.filter((term) => containsTerm(corpus, term)).length
    if (domainMatches === 0) return []
    const preferredMatches = matchedRule.preferredOfferTerms.filter((term) => containsTerm(corpus, term)).length
    const directMatches = contactTokens.filter((token) => containsTerm(corpus, token)).length
    return [{ offer, score: domainMatches * 5 + preferredMatches * 4 + directMatches }]
  }).sort((a, b) => b.score - a.score || a.offer.name.localeCompare(b.offer.name, "fr"))

  const best = ranked[0]
  if (!best || best.score < 5) return null
  return { offerId: best.offer.id, offerName: best.offer.name }
}

export function getVisibleOpenQuestions(facts: readonly AccountKnowledgeFact[] | null | undefined): AccountKnowledgeFact[] {
  return (facts ?? []).filter((fact) => !fact.dismissed)
}

export function hasVisibleOpenQuestions(facts: readonly AccountKnowledgeFact[] | null | undefined): boolean {
  return getVisibleOpenQuestions(facts).length > 0
}

// Ne re-trie PAS : intelligence-data.ts trie déjà `accountSignals` par
// fraîcheur de parution avant de les transmettre. Un second tri ici (par
// exemple sur detectedAt) romprait cet ordre — un des deux critères gagnerait
// arbitrairement selon leur écart, comme le bug déjà corrigé sur ce même flux.
export function getInitialAccountSignals<T>(signals: readonly T[], limit = 5): T[] {
  return signals.slice(0, limit)
}
