// ─────────────────────────────────────────────────────────────────────────────
//  Compétences VS Besoins — règles pures.
//
//  Lecture PORTEFEUILLE de l'adéquation entre la capacité réellement sourcée
//  par Kredo (collaborateurs + candidats du vivier) et la demande réellement
//  reçue (besoins ouverts sur 12 mois glissants).
//
//  ⚠️ Ce n'est PAS un matching. Le matching décide d'un profil sur UN besoin
//  (`runOpportunityMatching`) ; ici on mesure un positionnement global. Les
//  deux doivent rester distincts — cf. audit du 24/08, §2.2 et §4.10.
//
//  Trois invariants :
//   • une personne qui est à la fois collaborateur et candidat est comptée une
//     fois dans l'effectif, mais reste visible dans les deux répartitions ;
//   • une tension ne se calcule pas quand l'offre est nulle. Diviser par zéro
//     donnerait « ratio infini » là où la réponse juste est « aucune offre » ;
//   • la fenêtre 90 jours est une part de la fenêtre 12 mois, jamais une
//     seconde mesure indépendante : c'est ce qui en fait une tendance.
// ─────────────────────────────────────────────────────────────────────────────

export type SkillTension = "no_supply" | "tight" | "balanced" | "idle"

export type SupplyRole = "collaborator" | "candidate"

/**
 * Part de la demande 12 mois concentrée sur les 90 derniers jours au-delà de
 * laquelle on parle d'accélération. 90 jours ≈ 25 % de la fenêtre : à 40 %, la
 * demande récente pèse nettement plus que sa durée.
 */
export const DEMAND_ACCELERATION_SHARE_PCT = 40

/**
 * Fenêtres d'analyse. Elles vivent ICI et non dans le module `"use server"` :
 * un fichier `"use server"` ne peut exporter que des fonctions async, et un
 * composant client qui en importerait une constante casse `next build` sans
 * que `tsc` n'y voie rien (CLAUDE.md, « quatre pièges récurrents »).
 */
export const SKILLS_VS_NEEDS_WINDOW_MONTHS = 12
export const SKILLS_VS_NEEDS_TREND_DAYS = 90

export type OpportunityDemandRow = {
  opportunityId: string
  openedAt: string | null
  skillId: string
  skillName: string
  category: string | null
}

export type SupplyPersonRow = {
  personId: string
  role: SupplyRole
  title: string | null
  practice: string | null
  seniority: string | null
}

export type SupplySkillRow = {
  personId: string
  skillId: string
  level: number | null
}

export type SkillBalance = {
  skillId: string
  skillName: string
  category: string | null
  demand12m: number
  demand90d: number
  /** Part de la demande 12 mois tombée sur les 90 derniers jours. */
  recentSharePct: number | null
  isAccelerating: boolean
  supplyCollaborators: number
  supplyCandidates: number
  supplyHeadcount: number
  /** Besoins par personne qui porte la compétence. `null` si aucune offre. */
  tensionRatio: number | null
  tension: SkillTension
}

export type SupplyRailEntry = {
  label: string
  collaborators: number
  candidates: number
  total: number
}

export type SkillsVsNeedsRulesResult = {
  window: { months: number; trendDays: number }
  summary: {
    demandedNeeds12m: number
    demandedNeeds90d: number
    supplyHeadcount: number
    collaboratorsCount: number
    candidatesCount: number
    skillsInTension: number
    skillsWithoutSupply: number
    skillsIdle: number
  }
  skills: SkillBalance[]
  topSkills: SupplyRailEntry[]
  topProfiles: SupplyRailEntry[]
  practices: SupplyRailEntry[]
}

export type BuildSkillsVsNeedsInput = {
  now: string
  windowMonths: number
  trendDays: number
  demand: OpportunityDemandRow[]
  supplyPeople: SupplyPersonRow[]
  supplySkills: SupplySkillRow[]
  /** Nom canonique par identifiant de compétence, pour le rail d'offre. */
  skillNameById: Record<string, string>
}

const DAY_MS = 24 * 60 * 60 * 1000

function classifyTension(demand12m: number, supplyHeadcount: number): SkillTension {
  if (demand12m > 0 && supplyHeadcount === 0) return "no_supply"
  if (demand12m === 0) return "idle"
  return demand12m / supplyHeadcount >= 1 ? "tight" : "balanced"
}

function rail(entries: Map<string, { collaborators: number; candidates: number }>): SupplyRailEntry[] {
  return [...entries.entries()]
    .map(([label, counts]) => ({
      label,
      collaborators: counts.collaborators,
      candidates: counts.candidates,
      total: counts.collaborators + counts.candidates,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

function bump(
  target: Map<string, { collaborators: number; candidates: number }>,
  label: string | null | undefined,
  role: SupplyRole,
) {
  const key = label?.trim()
  if (!key) return
  const current = target.get(key) ?? { collaborators: 0, candidates: 0 }
  if (role === "collaborator") current.collaborators += 1
  else current.candidates += 1
  target.set(key, current)
}

export function buildSkillsVsNeeds(input: BuildSkillsVsNeedsInput): SkillsVsNeedsRulesResult {
  const now = new Date(input.now)
  const trendFloor = new Date(now.getTime() - input.trendDays * DAY_MS)

  // ── Offre ────────────────────────────────────────────────────────────────
  const roleByPerson = new Map<string, Set<SupplyRole>>()
  const skillsRail = new Map<string, { collaborators: number; candidates: number }>()
  const profilesRail = new Map<string, { collaborators: number; candidates: number }>()
  const practicesRail = new Map<string, { collaborators: number; candidates: number }>()

  for (const person of input.supplyPeople) {
    const roles = roleByPerson.get(person.personId) ?? new Set<SupplyRole>()
    roles.add(person.role)
    roleByPerson.set(person.personId, roles)
    bump(profilesRail, person.title, person.role)
    bump(practicesRail, person.practice, person.role)
  }

  const collaboratorsCount = input.supplyPeople.filter((person) => person.role === "collaborator").length
  const candidatesCount = input.supplyPeople.filter((person) => person.role === "candidate").length

  // Un porteur de compétence est compté une fois par compétence et par rôle,
  // même s'il apparaît deux fois dans `supplySkills`.
  const holdersBySkill = new Map<string, { collaborators: Set<string>; candidates: Set<string> }>()
  for (const entry of input.supplySkills) {
    const roles = roleByPerson.get(entry.personId)
    if (!roles) continue

    const holders = holdersBySkill.get(entry.skillId) ?? { collaborators: new Set(), candidates: new Set() }
    if (roles.has("collaborator")) holders.collaborators.add(entry.personId)
    if (roles.has("candidate")) holders.candidates.add(entry.personId)
    holdersBySkill.set(entry.skillId, holders)

    const skillName = input.skillNameById[entry.skillId]
    if (skillName) {
      if (roles.has("collaborator")) bump(skillsRail, skillName, "collaborator")
      if (roles.has("candidate")) bump(skillsRail, skillName, "candidate")
    }
  }

  // ── Demande ──────────────────────────────────────────────────────────────
  // Un besoin qui cite deux fois la même compétence ne compte qu'une fois.
  const demandBySkill = new Map<string, {
    skillName: string
    category: string | null
    all: Set<string>
    recent: Set<string>
  }>()

  const needs12m = new Set<string>()
  const needs90d = new Set<string>()

  for (const row of input.demand) {
    const openedAt = row.openedAt ? new Date(row.openedAt) : null
    const isRecent = Boolean(openedAt && !Number.isNaN(openedAt.getTime()) && openedAt >= trendFloor)

    needs12m.add(row.opportunityId)
    if (isRecent) needs90d.add(row.opportunityId)

    const entry = demandBySkill.get(row.skillId) ?? {
      skillName: row.skillName,
      category: row.category,
      all: new Set<string>(),
      recent: new Set<string>(),
    }
    entry.all.add(row.opportunityId)
    if (isRecent) entry.recent.add(row.opportunityId)
    demandBySkill.set(row.skillId, entry)
  }

  // ── Matrice ──────────────────────────────────────────────────────────────
  const skillIds = new Set([...demandBySkill.keys(), ...holdersBySkill.keys()])

  const skills = [...skillIds]
    .map<SkillBalance>((skillId) => {
      const demand = demandBySkill.get(skillId)
      const holders = holdersBySkill.get(skillId)

      const demand12m = demand?.all.size ?? 0
      const demand90d = demand?.recent.size ?? 0
      const supplyCollaborators = holders?.collaborators.size ?? 0
      const supplyCandidates = holders?.candidates.size ?? 0
      const supplyHeadcount = new Set([
        ...(holders?.collaborators ?? []),
        ...(holders?.candidates ?? []),
      ]).size

      const recentSharePct = demand12m > 0
        ? Math.round((demand90d / demand12m) * 1000) / 10
        : null

      return {
        skillId,
        skillName: demand?.skillName ?? input.skillNameById[skillId] ?? "Compétence",
        category: demand?.category ?? null,
        demand12m,
        demand90d,
        recentSharePct,
        isAccelerating: recentSharePct !== null && recentSharePct >= DEMAND_ACCELERATION_SHARE_PCT,
        supplyCollaborators,
        supplyCandidates,
        supplyHeadcount,
        tensionRatio: supplyHeadcount > 0 && demand12m > 0
          ? Math.round((demand12m / supplyHeadcount) * 100) / 100
          : null,
        tension: classifyTension(demand12m, supplyHeadcount),
      }
    })
    .sort((a, b) => (
      tensionRank(a.tension) - tensionRank(b.tension) ||
      b.demand12m - a.demand12m ||
      a.skillName.localeCompare(b.skillName)
    ))

  return {
    window: { months: input.windowMonths, trendDays: input.trendDays },
    summary: {
      demandedNeeds12m: needs12m.size,
      demandedNeeds90d: needs90d.size,
      supplyHeadcount: roleByPerson.size,
      collaboratorsCount,
      candidatesCount,
      skillsInTension: skills.filter((skill) => skill.tension === "tight").length,
      skillsWithoutSupply: skills.filter((skill) => skill.tension === "no_supply").length,
      skillsIdle: skills.filter((skill) => skill.tension === "idle").length,
    },
    skills,
    topSkills: rail(skillsRail).slice(0, 8),
    topProfiles: rail(profilesRail).slice(0, 5),
    practices: rail(practicesRail),
  }
}

function tensionRank(tension: SkillTension): number {
  return tension === "no_supply" ? 0 : tension === "tight" ? 1 : tension === "balanced" ? 2 : 3
}
