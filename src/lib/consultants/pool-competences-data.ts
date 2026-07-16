import type { OfferPracticeCatalogRow } from "@/lib/reference-data/get-offer-practices-catalog"
import type { OfferCatalogRow } from "@/lib/reference-data/get-offers-catalog"
import type { SkillCatalogRow } from "@/lib/reference-data/get-skills-catalog"
import type { JobProfileCatalogRow } from "@/lib/reference-data/get-job-profiles-catalog"

export type SkillCategory =
  | "certification"
  | "cloud"
  | "data"
  | "devops"
  | "fonctionnel"
  | "framework"
  | "langage"
  | "methode"
  | "secteur"
  | "soft_skill"
  | "autre"

export type PracticeTone = "primary" | "success" | "warning" | "danger" | "accent" | "info" | "idea" | "neutral"

export type OfferNode = {
  id: string
  name: string
  slug: string
  shortDescription: string | null
  keywords: string[]
  typicalDeliverables: string[]
  typicalProfiles: string[]
  useCases: string[]
}

export type JobProfileNode = {
  id: string
  title: string
  mainMission: string
  techStack: string[]
  responsibilities: string[]
  kpis: string[]
}

export type PracticeTerritory = {
  id: string
  name: string
  slug: string
  description: string
  perimeter: string
  stackTags: string[]
  tone: PracticeTone
  colorHex: string | null
  skillNames: string[]
  offers: OfferNode[]
  profiles: JobProfileNode[]
  updatedAt: string
}

export type SkillNode = {
  id: string
  name: string
  category: SkillCategory
  skillDescription?: string | null
  aliases: string[]
  supplyCount: number
  demandCount: number
  averageLevel: number | null
}

export type PoolCompetencesDataset = {
  practices: PracticeTerritory[]
  skills: SkillNode[]
  lastUpdatedAt: string | null
}

// Alignés sur les catalogues mis en cache (src/lib/reference-data) plutôt que sur
// les Row complètes de la DB — ce fichier n'a jamais consommé que ce sous-ensemble
// de colonnes (audité avant migration vers le cache, Session 28).
type PracticeRow = OfferPracticeCatalogRow
type OfferRow = OfferCatalogRow
type SkillRow = SkillCatalogRow
type JobProfileRow = JobProfileCatalogRow
type SkillReference = Pick<SkillRow, "id" | "name" | "category" | "skill_description" | "aliases">
type OpportunityReference = {
  practice: string | null
  stage: string
}

export type PersonSkillRow = {
  person_id: string
  level: number | null
  years: number | null
  skill: SkillReference | SkillReference[] | null
}

export type OpportunitySkillDemandRow = {
  opportunity: OpportunityReference | OpportunityReference[] | null
  skill: SkillReference | SkillReference[] | null
  weight: number
}

type BuildPoolCompetencesDatasetInput = {
  practices: PracticeRow[]
  offers: OfferRow[]
  skills: SkillRow[]
  jobProfiles: JobProfileRow[]
  personSkills: PersonSkillRow[]
  opportunitySkillDemand: OpportunitySkillDemandRow[]
  collaboratorPracticeByPersonId: Map<string, string>
  collaboratorTitleByPersonId: Map<string, string>
}

const toneBySlug: Record<string, PracticeTone> = {
  "data-ai": "primary",
  "cloud-engineering": "success",
  "digital-business-solutions": "info",
  "digital-experience": "accent",
  cybersecurity: "danger",
  "legacy-systems-mainframe": "idea",
  "project-agile-delivery": "warning",
  "quality-engineering-testing": "neutral",
}

const categoryAliases: Record<string, SkillCategory> = {
  certification: "certification",
  cloud: "cloud",
  data: "data",
  devops: "devops",
  fonctionnel: "fonctionnel",
  functional: "fonctionnel",
  framework: "framework",
  frameworks: "framework",
  langage: "langage",
  language: "langage",
  methode: "methode",
  method: "methode",
  methods: "methode",
  secteur: "secteur",
  sector: "secteur",
  soft_skill: "soft_skill",
  "soft skill": "soft_skill",
  softskills: "soft_skill",
}

const practiceAliases: Record<string, string[]> = {
  "data-ai": [
    "data",
    "data ai",
    "data & ai",
    "data ia",
    "data intelligence",
    "artificial intelligence",
    "ia",
  ],
  "cloud-engineering": ["cloud", "cloud engineering", "digital cloud engineering"],
  "digital-business-solutions": [
    "digital",
    "digital business",
    "business solutions",
    "software",
    "application",
    "fullstack",
    "full-stack",
  ],
  "digital-experience": ["design", "mobile", "product management", "digital experience", "ux", "ui"],
  cybersecurity: ["cybersecurity", "cyber", "secops", "security", "cybersecurity secops"],
  "legacy-systems-mainframe": ["legacy", "mainframe", "cobol", "ibm z"],
  "project-agile-delivery": ["project management", "agile", "delivery", "scrum master", "pmo"],
  "quality-engineering-testing": ["qa", "testing", "quality", "quality engineering", "test"],
}

const weakSkillTokens = new Set([
  "and",
  "api",
  "app",
  "de",
  "des",
  "du",
  "for",
  "ia",
  "it",
  "la",
  "le",
  "les",
  "of",
  "the",
  "to",
])

export function buildPoolCompetencesDataset(input: BuildPoolCompetencesDatasetInput): PoolCompetencesDataset {
  const activePractices = input.practices
    .filter((practice) => practice.is_active)
    .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name))

  const offersByPracticeId = groupBy(input.offers.filter((offer) => offer.is_active), (offer) => offer.practice_id)
  const profilesByPracticeId = groupBy(input.jobProfiles.filter((profile) => profile.is_active), (profile) => profile.practice_id)
  const skillScoresByPractice = new Map<string, Map<string, number>>()
  const supplyCountsBySkill = new Map<string, number>()
  const demandCountsBySkill = new Map<string, number>()
  const levelsBySkill = new Map<string, number[]>()

  for (const practice of activePractices) {
    const practiceOffers = offersByPracticeId.get(practice.id) ?? []
    const practiceProfiles = profilesByPracticeId.get(practice.id) ?? []
    const corpus = normalize([
      practice.name,
      practice.slug,
      practice.description,
      practice.perimeter,
      ...practice.stack_tags,
      ...practiceOffers.flatMap((offer) => [
        offer.name,
        offer.short_description,
        offer.full_description,
        ...offer.keywords,
        ...offer.typical_deliverables,
        ...offer.typical_profiles,
        ...offer.use_cases,
      ]),
      ...practiceProfiles.flatMap((profile) => [
        profile.title,
        profile.main_mission,
        ...profile.tech_stack,
        ...profile.responsibilities,
        ...profile.kpis,
      ]),
    ].filter(Boolean).join(" "))

    const scores = ensureScoreMap(skillScoresByPractice, practice.slug)

    for (const skill of input.skills) {
      const score = scoreSkillAgainstCorpus(skill, corpus)
      if (score > 0) scores.set(skill.name, score)
    }
  }

  for (const personSkill of input.personSkills) {
    const skill = firstRelation(personSkill.skill)
    if (!skill) continue

    increment(supplyCountsBySkill, skill.name, 1)
    if (typeof personSkill.level === "number") {
      const levels = levelsBySkill.get(skill.name) ?? []
      levels.push(personSkill.level)
      levelsBySkill.set(skill.name, levels)
    }

    const practiceSlug = resolvePracticeSlug(
      [
        input.collaboratorPracticeByPersonId.get(personSkill.person_id),
        input.collaboratorTitleByPersonId.get(personSkill.person_id),
      ].filter(Boolean).join(" "),
      activePractices
    )
    if (!practiceSlug) continue

    const score = 7 + (personSkill.level ?? 0)
    increment(ensureScoreMap(skillScoresByPractice, practiceSlug), skill.name, score)
  }

  for (const demand of input.opportunitySkillDemand) {
    const skill = firstRelation(demand.skill)
    const opportunity = firstRelation(demand.opportunity)
    if (!skill) continue
    if (["won", "lost", "abandoned"].includes(opportunity?.stage ?? "")) continue

    const amount = Math.max(1, Math.round(demand.weight || 1))
    increment(demandCountsBySkill, skill.name, amount)

    const practiceSlug = resolvePracticeSlug(opportunity?.practice, activePractices)
    if (!practiceSlug) continue
    increment(ensureScoreMap(skillScoresByPractice, practiceSlug), skill.name, 8 + amount)
  }

  const skills: SkillNode[] = input.skills
    .map((skill) => {
      const levels = levelsBySkill.get(skill.name) ?? []
      const averageLevel =
        levels.length > 0
          ? Math.round((levels.reduce((sum, value) => sum + value, 0) / levels.length) * 10) / 10
          : null

      return {
        id: skill.id,
        name: skill.name,
        category: normalizeSkillCategory(skill.category),
        skillDescription: skill.skill_description,
        aliases: skill.aliases ?? [],
        supplyCount: supplyCountsBySkill.get(skill.name) ?? 0,
        demandCount: demandCountsBySkill.get(skill.name) ?? 0,
        averageLevel,
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))

  const skillLookup = new Set(skills.map((skill) => skill.name))
  const practices: PracticeTerritory[] = activePractices.map((practice) => {
    const scoredSkills = Array.from((skillScoresByPractice.get(practice.slug) ?? new Map()).entries())
      .filter(([name]) => skillLookup.has(name))
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([name]) => name)

    return {
      id: practice.id,
      name: practice.name,
      slug: practice.slug,
      description: practice.description ?? "Practice sans description renseignee.",
      perimeter: practice.perimeter ?? practice.description ?? "Perimetre a completer.",
      stackTags: practice.stack_tags ?? [],
      tone: toneBySlug[practice.slug] ?? "neutral",
      colorHex: practice.color_hex,
      skillNames: Array.from(new Set(scoredSkills)),
      offers: (offersByPracticeId.get(practice.id) ?? [])
        .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name))
        .map(mapOffer),
      profiles: (profilesByPracticeId.get(practice.id) ?? [])
        .sort((left, right) => left.title.localeCompare(right.title))
        .map(mapJobProfile),
      updatedAt: practice.updated_at,
    }
  })

  const lastUpdatedAt = activePractices
    .map((practice) => practice.updated_at)
    .sort()
    .at(-1) ?? null

  return { practices, skills, lastUpdatedAt }
}

export function resolvePracticeSlug(value: string | null | undefined, practices: PracticeTerritory[] | PracticeRow[]): string | null {
  const normalized = normalize(value)
  if (!normalized) return null

  for (const practice of practices) {
    if (normalize(practice.slug) === normalized || normalize(practice.name) === normalized) {
      return practice.slug
    }

    const aliases = practiceAliases[practice.slug] ?? []
    if (aliases.some((alias) => normalized.includes(normalize(alias)))) {
      return practice.slug
    }
  }

  return null
}

export function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function normalizeSkillCategory(category: string | null): SkillCategory {
  const normalized = normalize(category).replace(/[-_]+/g, " ").trim()
  return categoryAliases[normalized] ?? "autre"
}

function mapOffer(offer: OfferRow): OfferNode {
  return {
    id: offer.id,
    name: offer.name,
    slug: offer.slug,
    shortDescription: offer.short_description,
    keywords: offer.keywords ?? [],
    typicalDeliverables: offer.typical_deliverables ?? [],
    typicalProfiles: offer.typical_profiles ?? [],
    useCases: offer.use_cases ?? [],
  }
}

function mapJobProfile(profile: JobProfileRow): JobProfileNode {
  return {
    id: profile.id,
    title: profile.title,
    mainMission: profile.main_mission,
    techStack: profile.tech_stack ?? [],
    responsibilities: profile.responsibilities ?? [],
    kpis: profile.kpis ?? [],
  }
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = getKey(item)
    const current = groups.get(key) ?? []
    current.push(item)
    groups.set(key, current)
  }
  return groups
}

function ensureScoreMap(map: Map<string, Map<string, number>>, slug: string): Map<string, number> {
  const current = map.get(slug)
  if (current) return current
  const next = new Map<string, number>()
  map.set(slug, next)
  return next
}

function increment(map: Map<string, number>, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function scoreSkillAgainstCorpus(skill: SkillRow | Pick<SkillRow, "name" | "aliases">, corpus: string): number {
  const candidates = [skill.name, ...(skill.aliases ?? [])].map(normalize).filter(Boolean)
  let score = 0

  for (const candidate of candidates) {
    if (corpus.includes(candidate)) score += candidate.length > 8 ? 6 : 4
  }

  const tokens = normalize(skill.name)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !weakSkillTokens.has(token))

  for (const token of tokens) {
    if (corpus.includes(token)) score += 1
  }

  return score
}
