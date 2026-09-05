import { getOpportunityStageLabel, isTerminalOpportunityStage } from "@/lib/opportunities/stages"
import { asNumber, daysBetween, parseDate } from "./shared"

export type StaffingOpportunityRow = {
  id: string
  title: string
  companyName: string | null
  stage: string | null
  conviction: number | null
  acv: number | null
  weightedGain: number | null
  estimatedGain: number | null
  targetCloseDate: string | null
  nextActionAt: string | null
}

export type OpportunitySkillDemandRow = {
  opportunityId: string
  skillId: string
  skillName: string
  category: string | null
  weight: number | null
  importance: string | null
  minLevel: number | null
}

export type PersonSkillSupplyRow = {
  personId: string
  skillId: string
  level: number | null
  confidence: number | null
}

export type ActiveCollaboratorRow = {
  id: string
  personId: string
  status: string | null
  availability: string | null
  currentTitle: string | null
  practice: string | null
}

export type RankedOpportunity = {
  opportunityId: string
  title: string
  companyName: string
  stage: string
  priorityScore: number
  drivers: string[]
  hasMatchingProfile: boolean
  daysToDeadline: number | null
  weightedGain: number
}

export type PrioritizePipelineRulesResult = {
  rankedOpportunities: RankedOpportunity[]
}

export type SkillGap = {
  skillId: string
  skillName: string
  category: string
  demandScore: number
  supplyScore: number
  gapRatio: number
  recommendation: "recruit" | "train" | "subcontract" | "covered"
  detail: string
}

export type AnalyzeNeedsRulesResult = {
  gaps: SkillGap[]
  summary: {
    criticalGaps: number
    moderateGaps: number
    coveredSkills: number
  }
}

export type ScanContactCompanyRow = {
  id: string
  name: string
  lifecycle: string
}

export type ScanContactRow = {
  id: string
  companyId: string | null
  relationshipRole: string | null
  status: string | null
}

export type AccountCoverage = {
  companyId: string
  companyName: string
  lifecycle: string
  presentRoles: string[]
  missingRoles: string[]
  coverageScore: number
}

export type ScanContactsRulesResult = {
  accountCoverage: AccountCoverage[]
  summary: {
    fullyMappedAccounts: number
    partialAccounts: number
    noContactAccounts: number
  }
}

export type BuildPrioritizePipelineInput = {
  now: string
  opportunities: StaffingOpportunityRow[]
  opportunitySkills: OpportunitySkillDemandRow[]
  personSkills: PersonSkillSupplyRow[]
  collaborators: ActiveCollaboratorRow[]
}

export type BuildAnalyzeNeedsInput = {
  opportunities: Pick<StaffingOpportunityRow, "id" | "stage">[]
  opportunitySkills: OpportunitySkillDemandRow[]
  personSkills: PersonSkillSupplyRow[]
  collaborators: ActiveCollaboratorRow[]
}

export type BuildScanContactsInput = {
  companies: ScanContactCompanyRow[]
  contacts: ScanContactRow[]
}

type RoleRequirement = {
  label: string
  anyOf: string[]
}

export const CONTACT_ROLE_REQUIREMENTS_BY_LIFECYCLE: Record<string, RoleRequirement[]> = {
  client: [
    { label: "opérationnel", anyOf: ["operationnel"] },
    { label: "décideur", anyOf: ["decideur", "sponsor"] },
    { label: "prescripteur", anyOf: ["prescripteur"] },
    { label: "acheteur", anyOf: ["acheteur"] },
  ],
  client_actif: [
    { label: "opérationnel", anyOf: ["operationnel"] },
    { label: "décideur", anyOf: ["decideur", "sponsor"] },
    { label: "prescripteur", anyOf: ["prescripteur"] },
    { label: "acheteur", anyOf: ["acheteur"] },
  ],
  prospect: [
    { label: "décideur ou prescripteur", anyOf: ["decideur", "prescripteur", "sponsor"] },
    { label: "acheteur", anyOf: ["acheteur"] },
  ],
}

const IMPORTANCE_FACTOR: Record<string, number> = {
  indispensable: 1.25,
  souhaitee: 1,
  souhaitée: 1,
  bonus: 0.6,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function normalizedImportance(value: string | null | undefined): number {
  if (!value) return 1
  return IMPORTANCE_FACTOR[value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()] ?? 1
}

export function normalizeDemandScore(row: Pick<OpportunitySkillDemandRow, "weight" | "importance" | "minLevel">): number {
  const weight = clamp(asNumber(row.weight), 0, 1)
  const level = clamp(asNumber(row.minLevel) || 3, 1, 5) / 5
  return weight * level * normalizedImportance(row.importance)
}

export function normalizeSupplyScore(row: Pick<PersonSkillSupplyRow, "level" | "confidence">): number {
  const level = clamp(asNumber(row.level), 0, 5) / 5
  const confidence = row.confidence === null || row.confidence === undefined ? 1 : clamp(row.confidence, 0, 1)
  return level * confidence
}

export function computeSkillMatchScore(demandRows: OpportunitySkillDemandRow[], personSkills: PersonSkillSupplyRow[]): number {
  if (demandRows.length === 0) return 0
  const supplyBySkill = new Map(personSkills.map((skill) => [skill.skillId, normalizeSupplyScore(skill)]))
  let weightedCoverage = 0
  let totalWeight = 0

  for (const demand of demandRows) {
    const weight = Math.max(0.1, clamp(asNumber(demand.weight), 0, 1)) * normalizedImportance(demand.importance)
    const requiredLevel = clamp(asNumber(demand.minLevel) || 3, 1, 5) / 5
    const supply = supplyBySkill.get(demand.skillId) ?? 0
    weightedCoverage += clamp(supply / requiredLevel, 0, 1) * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? Math.round((weightedCoverage / totalWeight) * 100) : 0
}

function bestProfileMatch(
  opportunityId: string,
  opportunitySkills: OpportunitySkillDemandRow[],
  personSkills: PersonSkillSupplyRow[],
  collaborators: ActiveCollaboratorRow[],
): { score: number; hasMatchingProfile: boolean } {
  const demandRows = opportunitySkills.filter((skill) => skill.opportunityId === opportunityId)
  if (demandRows.length === 0) return { score: 0, hasMatchingProfile: false }

  const skillsByPerson = groupBy(personSkills, (skill) => skill.personId)
  const scores = collaborators
    .filter((collaborator) => isStaffableCollaboratorStatus(collaborator.status))
    .map((collaborator) => computeSkillMatchScore(demandRows, skillsByPerson.get(collaborator.personId) ?? []))

  const score = Math.max(0, ...scores)
  return { score, hasMatchingProfile: score >= 70 }
}

function opportunityDeadlineDays(opportunity: StaffingOpportunityRow, now: Date): number | null {
  const deadline = opportunity.targetCloseDate ?? opportunity.nextActionAt
  if (!parseDate(deadline)) return null
  return daysBetween(now, deadline as string)
}

function deadlineScore(days: number | null): number {
  if (days === null) return 35
  if (days <= 0) return 100
  if (days <= 7) return 95
  if (days <= 30) return 75
  if (days <= 60) return 50
  return 25
}

function valueScore(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0
  return Math.round(clamp(value / maxValue, 0, 1) * 100)
}

function convictionScore(value: number | null): number {
  const raw = asNumber(value)
  return raw <= 1 ? Math.round(clamp(raw, 0, 1) * 100) : Math.round(clamp(raw, 0, 100))
}

function isClosedOpportunityStage(stage: string | null | undefined): boolean {
  return isTerminalOpportunityStage(stage) || stage === "won" || stage === "lost" || stage === "abandoned"
}

function buildDrivers(input: {
  opportunity: StaffingOpportunityRow
  value: number
  deadlineDays: number | null
  profileScore: number
  hasMatchingProfile: boolean
  conviction: number
}): string[] {
  const drivers: string[] = []
  if (input.value >= 100_000) drivers.push(`Haute valeur (${Math.round(input.value / 1000)} k€)`)
  if (input.deadlineDays !== null && input.deadlineDays <= 14) drivers.push(`Deadline proche (${Math.max(0, input.deadlineDays)} j)`)
  if (input.hasMatchingProfile) drivers.push(`Profil interne compatible (${input.profileScore}%)`)
  if (!input.hasMatchingProfile && input.profileScore > 0) drivers.push(`Couverture compétences partielle (${input.profileScore}%)`)
  if (input.profileScore === 0) drivers.push("Aucun profil compatible détecté")
  if (input.conviction >= 70) drivers.push(`Conviction élevée (${input.conviction}%)`)
  if (drivers.length === 0) drivers.push("Priorité équilibrée")
  return drivers.slice(0, 3)
}

export function buildPrioritizePipeline(input: BuildPrioritizePipelineInput): PrioritizePipelineRulesResult {
  const now = parseDate(input.now) ?? new Date()
  const openOpportunities = input.opportunities.filter((opportunity) => !isClosedOpportunityStage(opportunity.stage))
  const maxValue = Math.max(...openOpportunities.map((opportunity) => asNumber(opportunity.acv) || asNumber(opportunity.weightedGain) || asNumber(opportunity.estimatedGain)), 0)

  const rankedOpportunities = openOpportunities
    .map<RankedOpportunity>((opportunity) => {
      const value = asNumber(opportunity.weightedGain) || asNumber(opportunity.acv) || asNumber(opportunity.estimatedGain)
      const daysToDeadline = opportunityDeadlineDays(opportunity, now)
      const profile = bestProfileMatch(opportunity.id, input.opportunitySkills, input.personSkills, input.collaborators)
      const conviction = convictionScore(opportunity.conviction)
      const priorityScore = Math.round(
        conviction * 0.3
        + valueScore(value, maxValue) * 0.3
        + deadlineScore(daysToDeadline) * 0.2
        + profile.score * 0.2,
      )

      return {
        opportunityId: opportunity.id,
        title: opportunity.title,
        companyName: opportunity.companyName ?? "Compte non renseigné",
        stage: getOpportunityStageLabel(opportunity.stage),
        priorityScore,
        drivers: buildDrivers({ opportunity, value, deadlineDays: daysToDeadline, profileScore: profile.score, hasMatchingProfile: profile.hasMatchingProfile, conviction }),
        hasMatchingProfile: profile.hasMatchingProfile,
        daysToDeadline,
        weightedGain: Math.round(value),
      }
    })
    .sort((left, right) => right.priorityScore - left.priorityScore || right.weightedGain - left.weightedGain)
    .slice(0, 10)

  return { rankedOpportunities }
}

/**
 * Un collaborateur compte dans l'effectif staffable tant qu'il n'est pas sorti.
 *
 * 🔴 `collaborators.status` ne vaut JAMAIS "active" : le référentiel réel est
 * `en_mission` / `intercontrat` / `sorti` (vérifié en base le 2026-09-04 —
 * 0 ligne sur 30 avec "active"). Comparer à "active" vidait silencieusement
 * l'effectif, ici comme dans la requête. On exclut le statut terminal plutôt
 * que de lister les statuts vivants : un nouveau statut entre alors dans
 * l'effectif au lieu d'en disparaître sans un mot.
 *
 * `"active"` reste accepté : c'est la valeur qu'emploient les jeux de test et
 * elle n'existe pas en base, donc l'accepter n'élargit rien.
 */
export function isStaffableCollaboratorStatus(status: string | null | undefined): boolean {
  return status !== "sorti"
}

export function buildAnalyzeNeeds(input: BuildAnalyzeNeedsInput): AnalyzeNeedsRulesResult {
  const openOpportunityIds = new Set(input.opportunities.filter((opportunity) => !isClosedOpportunityStage(opportunity.stage)).map((opportunity) => opportunity.id))
  const activePersonIds = new Set(input.collaborators.filter((collaborator) => isStaffableCollaboratorStatus(collaborator.status)).map((collaborator) => collaborator.personId))
  const demandBySkill = new Map<string, { skillName: string; category: string; demandScore: number; opportunityIds: Set<string> }>()
  const supplyBySkill = new Map<string, { supplyScore: number; personIds: Set<string> }>()

  for (const row of input.opportunitySkills) {
    if (!openOpportunityIds.has(row.opportunityId)) continue
    const current = demandBySkill.get(row.skillId) ?? { skillName: row.skillName, category: row.category ?? "autre", demandScore: 0, opportunityIds: new Set<string>() }
    current.demandScore += normalizeDemandScore(row)
    current.opportunityIds.add(row.opportunityId)
    demandBySkill.set(row.skillId, current)
  }

  for (const row of input.personSkills) {
    if (!activePersonIds.has(row.personId)) continue
    const current = supplyBySkill.get(row.skillId) ?? { supplyScore: 0, personIds: new Set<string>() }
    current.supplyScore += normalizeSupplyScore(row)
    current.personIds.add(row.personId)
    supplyBySkill.set(row.skillId, current)
  }

  const gaps = Array.from(demandBySkill.entries())
    .map<SkillGap>(([skillId, demand]) => {
      const supply = supplyBySkill.get(skillId)
      const demandScore = round(demand.demandScore, 2)
      const supplyScore = round(supply?.supplyScore ?? 0, 2)
      const gapRatio = supplyScore <= 0 ? 99 : round(demandScore / supplyScore, 2)
      const recommendation: SkillGap["recommendation"] =
        supplyScore <= 0 ? "subcontract"
          : gapRatio > 3 ? "recruit"
            : gapRatio > 1.5 ? "train"
              : "covered"
      const detail =
        recommendation === "subcontract" ? "Aucune capacité interne détectée sur le pipe ouvert."
          : recommendation === "recruit" ? "Écart critique entre demande pipeline et capacité interne."
            : recommendation === "train" ? "Renforcer les profils existants ou sécuriser un binôme."
              : "Capacité interne suffisante à ce stade."

      return {
        skillId,
        skillName: demand.skillName,
        category: demand.category,
        demandScore,
        supplyScore,
        gapRatio,
        recommendation,
        detail,
      }
    })
    .sort((left, right) => right.gapRatio - left.gapRatio || right.demandScore - left.demandScore)
    .slice(0, 10)

  return {
    gaps,
    summary: {
      criticalGaps: gaps.filter((gap) => gap.gapRatio > 3).length,
      moderateGaps: gaps.filter((gap) => gap.gapRatio > 1.5 && gap.gapRatio <= 3).length,
      coveredSkills: gaps.filter((gap) => gap.gapRatio <= 1.5).length,
    },
  }
}

function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null
  const normalized = role.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  if (normalized === "sponsor") return "sponsor"
  if (normalized.includes("decid") || normalized.includes("dsi") || normalized.includes("direction")) return "decideur"
  if (normalized.includes("prescrip") || normalized === "rh") return "prescripteur"
  if (normalized.includes("achat")) return "acheteur"
  if (normalized.includes("oper") || normalized.includes("manager") || normalized.includes("utilisateur")) return "operationnel"
  return normalized
}

function roleLabel(role: string): string {
  if (role === "decideur") return "décideur"
  if (role === "prescripteur") return "prescripteur"
  if (role === "acheteur") return "acheteur"
  if (role === "operationnel") return "opérationnel"
  if (role === "sponsor") return "sponsor"
  return role
}

export function buildScanContacts(input: BuildScanContactsInput): ScanContactsRulesResult {
  const contactsByCompany = groupBy(
    input.contacts.filter((contact) => contact.companyId && contact.status !== "archive"),
    (contact) => contact.companyId ?? "",
  )
  const coveredAccounts = input.companies
    .filter((company) => company.lifecycle in CONTACT_ROLE_REQUIREMENTS_BY_LIFECYCLE)
    .map<AccountCoverage>((company) => {
      const contacts = contactsByCompany.get(company.id) ?? []
      const roles = Array.from(new Set(contacts.map((contact) => normalizeRole(contact.relationshipRole)).filter((role): role is string => Boolean(role))))
      const requirements = CONTACT_ROLE_REQUIREMENTS_BY_LIFECYCLE[company.lifecycle] ?? []
      const missingRoles = requirements
        .filter((requirement) => !requirement.anyOf.some((role) => roles.includes(role)))
        .map((requirement) => requirement.label)

      return {
        companyId: company.id,
        companyName: company.name,
        lifecycle: company.lifecycle,
        presentRoles: roles.map(roleLabel),
        missingRoles,
        coverageScore: requirements.length > 0 ? Math.round(((requirements.length - missingRoles.length) / requirements.length) * 100) : 100,
      }
    })

  return {
    accountCoverage: coveredAccounts
      .filter((account) => account.missingRoles.length > 0)
      .sort((left, right) => left.coverageScore - right.coverageScore || left.companyName.localeCompare(right.companyName, "fr"))
      .slice(0, 10),
    summary: {
      fullyMappedAccounts: coveredAccounts.filter((account) => account.missingRoles.length === 0).length,
      partialAccounts: coveredAccounts.filter((account) => account.missingRoles.length > 0 && account.presentRoles.length > 0).length,
      noContactAccounts: coveredAccounts.filter((account) => account.presentRoles.length === 0).length,
    },
  }
}

function groupBy<T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const key = keyFn(row)
    const current = map.get(key) ?? []
    current.push(row)
    map.set(key, current)
  }
  return map
}
