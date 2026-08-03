import { OfferPracticeCatalogRow } from "@/lib/reference-data/get-offer-practices-catalog"
import { JobProfileCatalogRow } from "@/lib/reference-data/get-job-profiles-catalog"
import { TechItem } from "./kredo-expertise.types"

export function buildTechnologies(
  practices: OfferPracticeCatalogRow[],
  jobs: JobProfileCatalogRow[]
): TechItem[] {
  const canonicalMap = new Map<string, string>()
  const techJobs = new Map<string, Set<string>>() 
  const techPractices = new Map<string, Set<string>>() 

  const addTech = (rawTech: string, practiceName?: string, jobId?: string) => {
    const trimmed = rawTech.trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()

    if (!canonicalMap.has(key)) {
      canonicalMap.set(key, trimmed)
    }

    if (practiceName) {
      if (!techPractices.has(key)) techPractices.set(key, new Set())
      techPractices.get(key)!.add(practiceName)
    }

    if (jobId) {
      if (!techJobs.has(key)) techJobs.set(key, new Set())
      techJobs.get(key)!.add(jobId)
    }
  }

  for (const p of practices) {
    if (p.stack_tags) {
      for (const tag of p.stack_tags) {
        addTech(tag, p.name, undefined)
      }
    }
  }

  for (const j of jobs) {
    const practice = practices.find((p) => p.id === j.practice_id)
    const practiceName = practice?.name
    if (j.tech_stack) {
      for (const tag of j.tech_stack) {
        addTech(tag, practiceName, j.id)
      }
    }
  }

  const techs: TechItem[] = []
  for (const [key, canonicalName] of canonicalMap.entries()) {
    const practicesList = Array.from(techPractices.get(key) ?? [])
    const jobIds = techJobs.get(key) ?? new Set()

    techs.push({
      name: canonicalName,
      practices: practicesList,
      jobCount: jobIds.size,
    })
  }

  return techs.sort((a, b) => a.name.localeCompare(b.name))
}
