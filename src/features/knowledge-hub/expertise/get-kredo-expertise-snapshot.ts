import "server-only"

import { createClient } from "@/lib/supabase/server"
import { getOfferPracticesCatalog } from "@/lib/reference-data/get-offer-practices-catalog"
import { getSkillsCatalog } from "@/lib/reference-data/get-skills-catalog"
import { getJobProfilesCatalog } from "@/lib/reference-data/get-job-profiles-catalog"
import { getOffersCatalog } from "@/lib/reference-data/get-offers-catalog"
import { KredoExpertiseSnapshot } from "./kredo-expertise.types"
import { buildTechnologies } from "./kredo-expertise-builders"

export async function getKredoExpertiseSnapshot(workspaceId: string): Promise<KredoExpertiseSnapshot> {
  const supabase = await createClient()

  const [practicesData, jobProfilesData, skillsData, offersData, personSkillsResult] = await Promise.all([
    getOfferPracticesCatalog(workspaceId),
    getJobProfilesCatalog(workspaceId),
    getSkillsCatalog(workspaceId),
    getOffersCatalog(workspaceId),
    supabase
      .from("person_skills")
      .select("skill_id, person_id"),
  ])

  const personSkills = personSkillsResult.data ?? []

  const skillProfileCounts = new Map<string, number>()
  for (const ps of personSkills) {
    if (!ps.skill_id) continue
    skillProfileCounts.set(ps.skill_id, (skillProfileCounts.get(ps.skill_id) ?? 0) + 1)
  }

  const practices = practicesData.map((p) => {
    const practiceJobs = jobProfilesData.filter((j) => j.practice_id === p.id)
    const practiceOffersData = offersData.filter((o) => o.practice_id === p.id)
    const practiceOffers = practiceOffersData.map((o) => ({
      id: o.id,
      practiceId: o.practice_id ?? "",
      slug: o.slug ?? "",
      name: o.name ?? "",
      shortDescription: o.short_description ?? null,
      fullDescription: o.full_description ?? null,
      keywords: o.keywords ?? [],
      typicalProfiles: o.typical_profiles ?? [],
      typicalDeliverables: o.typical_deliverables ?? [],
      useCases: o.use_cases ?? [],
    }))

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      perimeter: p.perimeter ?? "",
      colorHex: p.color_hex,
      stackTags: p.stack_tags ?? [],
      jobCount: practiceJobs.length,
      offers: practiceOffers,
    }
  })

  const jobs = jobProfilesData.map((j) => {
    const practice = practicesData.find((p) => p.id === j.practice_id)
    return {
      id: j.id,
      title: j.title,
      practiceId: j.practice_id ?? "",
      practiceName: practice?.name ?? "Non rattaché",
      mainMission: j.main_mission ?? "",
      techStack: j.tech_stack ?? [],
      responsibilities: j.responsibilities ?? [],
      kpis: j.kpis ?? [],
    }
  })

  const skills = skillsData.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category ?? "autre",
    description: s.skill_description ?? null,
    profileCount: skillProfileCounts.get(s.id) ?? 0,
  }))

  const technologies = buildTechnologies(practicesData, jobProfilesData, skillsData)

  return {
    practices,
    jobs,
    skills,
    technologies,
  }
}
